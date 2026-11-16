import { expect, request, test, type APIRequestContext, type APIResponse } from "@playwright/test";

type Manifest = { marker: string; requestId: string; employeeId: string; managerId: string };
type Account = { email: string; password: string };
type Session = { client: APIRequestContext; csrf: string };

async function signedIn(baseURL: string, account: Account, expectedRole: "EMPLOYEE" | "MANAGER"): Promise<Session> {
  const client = await request.newContext({ baseURL });
  const bootstrap = await client.get("/api/auth/csrf");
  expect(bootstrap.status()).toBe(200);
  const token = (await bootstrap.json() as { token: string }).token;
  const login = await client.post("/api/auth/login", { headers: { "X-CSRF-TOKEN": token }, data: account });
  expect(login.status()).toBe(200);
  const identity = await client.get("/api/me");
  expect(identity.status()).toBe(200);
  expect((await identity.json() as { role: string }).role).toBe(expectedRole);
  const refreshed = await client.get("/api/auth/csrf");
  expect(refreshed.status()).toBe(200);
  return { client, csrf: (await refreshed.json() as { token: string }).token };
}

async function expectNoProtectedData(response: APIResponse, status: number) {
  expect(response.status()).toBe(status);
  expect(response.headers()["content-type"]?.split(";")[0]).toBe("application/problem+json");
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  expect(body).toMatchObject({ type: expect.any(String), title: expect.any(String), status });
  const protectedFields = ["id", "employeeId", "employeeEmail", "employeeName", "startDate", "endDate", "reason"];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        expect(protectedFields).not.toContain(key);
        visit(child);
      }
    }
  };
  visit(body);
}

test("authorization matches through the frontend proxy and directly to the backend", async () => {
  test.setTimeout(90_000);
  const employee = { email: process.env.DEMO_EMPLOYEE_EMAIL!, password: process.env.DEMO_EMPLOYEE_PASSWORD! };
  const seededManager = { email: process.env.DEMO_MANAGER_EMAIL!, password: process.env.DEMO_MANAGER_PASSWORD! };
  const manifest = JSON.parse(process.env.E2E_MANIFEST ?? "{}") as Manifest;
  if (!employee.email || !employee.password || !seededManager.email || !seededManager.password || !manifest.marker || !manifest.requestId || !manifest.employeeId || !manifest.managerId) {
    throw new Error("Runtime credentials and fixture manifest are required.");
  }
  const fixtureManager = {
    email: `${manifest.marker}.manager@invalid.test`,
    password: `e2e-fixture-${manifest.marker}`,
  };
  const fixtureEmployee = {
    email: `${manifest.marker}.employee@invalid.test`,
    password: `e2e-fixture-${manifest.marker}`,
  };
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() + 30);
  const validCreate = {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: startDate.toISOString().slice(0, 10),
    reason: `Authorization probe ${manifest.marker}`,
  };

  for (const origin of ["http://frontend:3000", "http://backend:8080"]) {
    const anonymous = await request.newContext({ baseURL: origin });
    await expectNoProtectedData(await anonymous.get("/api/leave-requests"), 401);
    await expectNoProtectedData(await anonymous.get(`/api/leave-requests/${manifest.requestId}`), 401);
    await expectNoProtectedData(await anonymous.post("/api/leave-requests", { data: validCreate }), 401);
    await expectNoProtectedData(await anonymous.post(`/api/leave-requests/${manifest.requestId}/decision`, { data: { decision: "APPROVED" } }), 401);
    await anonymous.dispose();

    const employeeSession = await signedIn(origin, employee, "EMPLOYEE");
    await expectNoProtectedData(await employeeSession.client.post(`/api/leave-requests/${manifest.requestId}/decision`, {
      headers: { "X-CSRF-TOKEN": employeeSession.csrf }, data: { decision: "APPROVED" },
    }), 403);
    await expectNoProtectedData(await employeeSession.client.get(`/api/leave-requests/${manifest.requestId}`), 404);
    await employeeSession.client.dispose();

    const managerSession = await signedIn(origin, seededManager, "MANAGER");
    await expectNoProtectedData(await managerSession.client.post("/api/leave-requests", {
      headers: { "X-CSRF-TOKEN": managerSession.csrf }, data: validCreate,
    }), 403);
    await expectNoProtectedData(await managerSession.client.get(`/api/leave-requests/${manifest.requestId}`), 404);
    await expectNoProtectedData(await managerSession.client.post(`/api/leave-requests/${manifest.requestId}/decision`, {
      headers: { "X-CSRF-TOKEN": managerSession.csrf }, data: { decision: "APPROVED" },
    }), 404);
    const seededManagerList = await managerSession.client.get("/api/leave-requests");
    expect(seededManagerList.status()).toBe(200);
    const seededManagerItems = (await seededManagerList.json() as { items: Array<{ id: string }> }).items;
    expect(seededManagerItems.some(item => item.id === manifest.requestId)).toBe(false);
    await managerSession.client.dispose();

    const fixtureEmployeeSession = await signedIn(origin, fixtureEmployee, "EMPLOYEE");
    const ownedRequest = await fixtureEmployeeSession.client.get(`/api/leave-requests/${manifest.requestId}`);
    expect(ownedRequest.status()).toBe(200);
    expect(await ownedRequest.json()).toMatchObject({ id: manifest.requestId });
    await fixtureEmployeeSession.client.dispose();

    const assignedManagerSession = await signedIn(origin, fixtureManager, "MANAGER");
    const me = await assignedManagerSession.client.get("/api/me");
    expect(me.status()).toBe(200);
    expect((await me.json() as { id: string }).id).toBe(manifest.managerId);
    const assignedList = await assignedManagerSession.client.get("/api/leave-requests");
    expect(assignedList.status()).toBe(200);
    const requestItems = (await assignedList.json() as { items: Array<{ id: string; employeeId?: string }> }).items;
    const fixtureRequest = requestItems.find(item => item.id === manifest.requestId);
    expect(fixtureRequest?.employeeId).toBe(manifest.employeeId);
    await assignedManagerSession.client.dispose();
  }
});
