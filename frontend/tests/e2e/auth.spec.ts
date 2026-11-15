import { expect, request, test } from "@playwright/test";

type SeededRole = {
  role: "EMPLOYEE" | "MANAGER";
  email: string;
  password: string;
  route: string;
};

test("both seeded roles complete real login, proxy session/CSRF rotation, and logout", async ({ page, baseURL }) => {
  const employeeEmail = process.env.DEMO_EMPLOYEE_EMAIL;
  const employeePassword = process.env.DEMO_EMPLOYEE_PASSWORD;
  const managerEmail = process.env.DEMO_MANAGER_EMAIL;
  const managerPassword = process.env.DEMO_MANAGER_PASSWORD;
  expect(employeeEmail && employeePassword && managerEmail && managerPassword).toBeTruthy();
  if (!employeeEmail || !employeePassword || !managerEmail || !managerPassword || !baseURL) {
    throw new Error("Set the four seeded demo account values in frontend/.env.local before Playwright.");
  }

  const accounts: SeededRole[] = [
    { role: "EMPLOYEE", email: employeeEmail, password: employeePassword, route: "/employee" },
    { role: "MANAGER", email: managerEmail, password: managerPassword, route: "/manager" },
  ];

  for (const account of accounts) {
    const logoutRequestHeaders: string[] = [];
    const loginRequestHeaders: string[] = [];
    const csrfTokens: string[] = [];
    const onRequest = (request: import("@playwright/test").Request) => {
      if (request.url().endsWith("/api/auth/logout")) {
        logoutRequestHeaders.push(request.headers()["x-csrf-token"] ?? "");
      }
      if (request.url().endsWith("/api/auth/login")) {
        loginRequestHeaders.push(request.headers()["x-csrf-token"] ?? "");
      }
    };
    const onResponse = (response: import("@playwright/test").Response) => {
      if (response.url().endsWith("/api/auth/csrf")) {
        void response.json().then((body: { token?: string }) => {
          if (body.token) csrfTokens.push(body.token);
        }).catch(() => undefined);
      }
    };
    page.on("request", onRequest);
    page.on("response", onResponse);
    await page.context().clearCookies();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect.poll(async () => (await page.context().cookies(baseURL)).some((cookie) => cookie.name === "LEAVESESSION")).toBe(true);
    await expect.poll(() => csrfTokens.length).toBeGreaterThan(0);
    const preLoginToken = csrfTokens.at(-1);
    const preLoginCookie = await page.context().cookies(baseURL);
    const preLoginSession = preLoginCookie.find((cookie) => cookie.name === "LEAVESESSION");
    expect(preLoginSession).toBeTruthy();

    await page.getByLabel(/email/i).fill(account.email);
    await page.getByLabel(/password/i).fill(account.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(new RegExp(`${account.route.replace("/", "\\/")}$`));

    const authenticatedCookies = await page.context().cookies(baseURL);
    const authenticatedSession = authenticatedCookies.find((cookie) => cookie.name === "LEAVESESSION");
    expect(authenticatedSession).toBeTruthy();
    expect(authenticatedSession!.value).not.toBe(preLoginSession!.value);
    expect(authenticatedSession!.httpOnly).toBe(true);
    expect(authenticatedSession!.sameSite).toBe("Lax");
    expect(authenticatedSession!.secure).toBe(baseURL.startsWith("https://"));
    await expect.poll(() => csrfTokens.length).toBeGreaterThan(1);
    const postLoginToken = csrfTokens.at(-1);
    expect(postLoginToken).toBeTruthy();
    expect(postLoginToken).not.toBe(preLoginToken);

    const staleSessionClient = await request.newContext({ baseURL });
    const stalePreLogin = await staleSessionClient.get("/api/me", {
      headers: { Cookie: `LEAVESESSION=${preLoginSession!.value}` },
    });
    expect(stalePreLogin.status()).toBe(401);

    const tokenCountBeforeLogout = csrfTokens.length;
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(logoutRequestHeaders.at(-1)).toBe(postLoginToken);

    const staleAuthenticated = await staleSessionClient.get("/api/me", {
      headers: { Cookie: `LEAVESESSION=${authenticatedSession!.value}` },
    });
    expect(staleAuthenticated.status()).toBe(401);
    await staleSessionClient.dispose();

    await expect.poll(() => csrfTokens.length).toBeGreaterThan(tokenCountBeforeLogout);
    const postLogoutToken = csrfTokens.at(-1);
    const postLogoutCookies = await page.context().cookies(baseURL);
    const postLogoutSession = postLogoutCookies.find((cookie) => cookie.name === "LEAVESESSION");
    expect(postLogoutSession).toBeTruthy();
    expect(postLogoutSession!.value).not.toBe(authenticatedSession!.value);
    await page.getByLabel(/email/i).fill(account.email);
    await page.getByLabel(/password/i).fill(account.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    expect(loginRequestHeaders.at(-1)).toBe(postLogoutToken);
    await expect(page).toHaveURL(new RegExp(`${account.route.replace("/", "\\/")}$`));
    page.off("request", onRequest);
    page.off("response", onResponse);
  }
});
