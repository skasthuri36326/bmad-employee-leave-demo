import { expect, test, type Locator, type Page } from "@playwright/test";

type Manifest = { marker: string };

const credentials = {
  employeeEmail: process.env.DEMO_EMPLOYEE_EMAIL,
  employeePassword: process.env.DEMO_EMPLOYEE_PASSWORD,
  managerEmail: process.env.DEMO_MANAGER_EMAIL,
  managerPassword: process.env.DEMO_MANAGER_PASSWORD,
};
const manifest = JSON.parse(process.env.E2E_MANIFEST ?? "{}") as Manifest;

async function signInByKeyboard(page: Page, email: string, password: string, route: RegExp) {
  await page.goto("/");
  const emailField = page.getByLabel(/email/i);
  const passwordField = page.getByLabel(/password/i);
  const signIn = page.getByRole("button", { name: /sign in/i });
  await expect(signIn).toBeEnabled();
  await page.keyboard.press("Tab");
  await expect(emailField).toBeFocused();
  await page.keyboard.type(email);
  await page.keyboard.press("Tab");
  await expect(passwordField).toBeFocused();
  await page.keyboard.type(password);
  await page.keyboard.press("Tab");
  await expect(signIn).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(route);
}

async function tabTo(page: Page, target: Locator) {
  for (let index = 0; index < 40; index += 1) {
    if (await target.evaluate(element => element === document.activeElement)) {
      await expect(target).toHaveCSS("outline-style", "solid");
      await expect(target).toHaveCSS("outline-width", "3px");
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error("Keyboard navigation did not reach the expected control.");
}

function requestItem(page: Page, reason: string, width: number) {
  return width === 390
    ? page.locator(".request-card").filter({ hasText: reason })
    : page.getByRole("row").filter({ hasText: reason });
}

test("Employee and Manager keyboard journeys persist separate decisions at desktop and phone sizes", async ({ page }) => {
  test.setTimeout(120_000);
  if (!credentials.employeeEmail || !credentials.employeePassword || !credentials.managerEmail || !credentials.managerPassword || !manifest.marker) {
    throw new Error("Runtime demo credentials and the E2E manifest are required.");
  }

  for (const viewport of [{ name: "desktop", width: 1280, height: 900 }, { name: "phone", width: 390, height: 844 }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const runMarker = `${manifest.marker}-${viewport.name}`;
    await signInByKeyboard(page, credentials.employeeEmail, credentials.employeePassword, /\/employee$/);

    const startDate = page.getByLabel(/start date/i);
    const endDate = page.getByLabel(/end date/i);
    const reasonField = page.getByLabel(/reason for requesting leave/i);
    const submit = page.getByRole("button", { name: "Submit request" });
    await tabTo(page, startDate);
    await startDate.fill("1900-01-01");
    await tabTo(page, endDate);
    await endDate.fill("1900-01-01");
    await tabTo(page, reasonField);
    await reasonField.fill(`${runMarker} invalid`);
    await reasonField.press("Tab");
    await expect(submit).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Start date must be today or later/i)).toBeVisible();
    await expect(startDate).toBeFocused();
    const describedBy = await startDate.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toContainText(/Start date must be today or later/i);

    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 25);
    const day = date.toISOString().slice(0, 10);
    for (const suffix of ["approve", "reject"]) {
      await tabTo(page, startDate);
      const requestPrefix = `${runMarker} ${suffix}`;
      const longPhoneReason = viewport.width === 390 && suffix === "reject" ? ` ${"x".repeat(490 - requestPrefix.length - 1)}` : "";
      const requestReason = `${requestPrefix}${longPhoneReason}`;
      await startDate.fill(day);
      await tabTo(page, endDate);
      await endDate.fill(day);
      await tabTo(page, reasonField);
      await reasonField.fill(requestReason);
      await reasonField.press("Tab");
      await expect(submit).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("status").filter({ hasText: /submitted with Pending status/i })).toBeVisible();
      await expect(requestItem(page, requestReason, viewport.width)).toHaveCount(1);
    }
    if (viewport.width === 390) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    }

    const employeeSignOut = page.getByRole("button", { name: "Sign out" });
    await tabTo(page, employeeSignOut);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/");
    await signInByKeyboard(page, credentials.managerEmail, credentials.managerPassword, /\/manager$/);

    for (const decision of ["approve", "reject"] as const) {
      const requestReason = `${runMarker} ${decision}`;
      const item = requestItem(page, requestReason, viewport.width);
      await expect(item).toHaveCount(1);
      await expect(item).toBeVisible();
      const action = item.getByRole("button", { name: decision === "approve" ? "Approve" : "Reject" });
      await expect(action).toBeVisible();
      await tabTo(page, action);
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toContainText(decision === "approve" ? "Approve" : "Reject");
      const confirm = page.getByRole("button", { name: `Confirm ${decision}` });
      await tabTo(page, confirm);
      await expect(confirm).toBeFocused();
      await page.keyboard.press("Enter");
      const status = item.locator(".status-badge");
      await expect(status).toHaveText(decision === "approve" ? "Approved" : "Rejected");
      await expect(status).toBeFocused();
      await expect(status).toHaveCSS("outline-width", "3px");
      await expect(page.getByRole("status")).toContainText(decision === "approve" ? "was approved" : "was rejected");
    }

    if (viewport.width === 390) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    }

    const managerListResponse = await page.request.get("/api/leave-requests");
    expect(managerListResponse.status()).toBe(200);
    const managerList = await managerListResponse.json() as { items: Array<{ id: string; reason: string }> };
    const csrfResponse = await page.request.get("/api/auth/csrf");
    expect(csrfResponse.status()).toBe(200);
    const csrf = (await csrfResponse.json() as { token: string }).token;
    for (const [suffix, decision] of [["approve", "REJECTED"], ["reject", "APPROVED"]] as const) {
      const item = requestItem(page, `${runMarker} ${suffix}`, viewport.width);
      const id = managerList.items.find(request => request.reason.startsWith(`${runMarker} ${suffix}`))?.id;
      expect(id).toBeTruthy();
      const repeat = await page.request.post(`/api/leave-requests/${id}/decision`, {
        headers: { "X-CSRF-TOKEN": csrf },
        data: { decision },
      });
      expect(repeat.status()).toBe(409);
      await expect(item.locator(".status-badge")).toHaveText(suffix === "approve" ? "Approved" : "Rejected");
    }

    const managerSignOut = page.getByRole("button", { name: "Sign out" });
    await tabTo(page, managerSignOut);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/");
    const listPath = "**/api/leave-requests";
    let releaseList: (() => void) | undefined;
    let notifyListRequested: (() => void) | undefined;
    let notifyListContinued: (() => void) | undefined;
    const listRequested = new Promise<void>(resolve => { notifyListRequested = resolve; });
    const listContinued = new Promise<void>(resolve => { notifyListContinued = resolve; });
    await page.route(listPath, async route => {
      notifyListRequested?.();
      await new Promise<void>(resolve => { releaseList = resolve; });
      try { await route.continue(); }
      finally { notifyListContinued?.(); }
    });
    try {
      await signInByKeyboard(page, credentials.employeeEmail, credentials.employeePassword, /\/employee$/);
      await listRequested;
      await expect(page.getByText(`${runMarker} approve`, { exact: true })).toHaveCount(0);
      await expect(page.getByText(`${runMarker} reject`, { exact: true })).toHaveCount(0);
    } finally {
      releaseList?.();
      if (releaseList) await listContinued;
      await page.unroute(listPath);
    }
    for (const [suffix, status] of [["approve", "Approved"], ["reject", "Rejected"]] as const) {
      const item = requestItem(page, `${runMarker} ${suffix}`, viewport.width);
      await expect(item).toHaveCount(1);
      await expect(item.locator(".status-badge")).toHaveText(status);
      await expect(item).toContainText(day);
      await expect(item).toBeVisible();
      if (suffix === "reject") await expect(item.getByText(/rejection reason/i)).toHaveCount(0);
    }
    if (viewport.width === 390) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    }
  }
});
