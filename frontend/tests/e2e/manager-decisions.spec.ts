import { expect, test } from "@playwright/test";

test("Manager approves and rejects two fresh assigned requests", async ({ page }) => {
  const employeeEmail = process.env.DEMO_EMPLOYEE_EMAIL, employeePassword = process.env.DEMO_EMPLOYEE_PASSWORD;
  const managerEmail = process.env.DEMO_MANAGER_EMAIL, managerPassword = process.env.DEMO_MANAGER_PASSWORD;
  if (!employeeEmail || !employeePassword || !managerEmail || !managerPassword) throw new Error("Set seeded Employee and Manager credentials before running Playwright.");
  const marker = `Manager decision ${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await page.goto("/");
  await page.getByLabel(/email/i).fill(employeeEmail); await page.getByLabel(/password/i).fill(employeePassword);
  await page.getByRole("button", { name: /sign in/i }).click(); await expect(page).toHaveURL(/\/employee$/);
  const date = new Date(); date.setUTCDate(date.getUTCDate() + 25); const day = date.toISOString().slice(0, 10);
  for (const suffix of ["approve", "reject"]) {
    await page.getByLabel(/start date/i).fill(day); await page.getByLabel(/end date/i).fill(day);
    await page.getByLabel(/reason for requesting leave/i).fill(`${marker} ${suffix}`);
    await page.getByRole("button", { name: "Submit request" }).click();
    await expect(page.getByRole("status").filter({ hasText: /submitted with Pending status/i })).toBeVisible();
  }
  await page.getByRole("button", { name: "Sign out" }).click(); await expect(page).toHaveURL("/");
  await page.getByLabel(/email/i).fill(managerEmail); await page.getByLabel(/password/i).fill(managerPassword);
  await page.getByRole("button", { name: /sign in/i }).click(); await expect(page).toHaveURL(/\/manager$/);
  await page.setViewportSize({ width: 390, height: 844 });
  const approvedCard = page.locator(".request-card").filter({ hasText: `${marker} approve` });
  const rejectedCard = page.locator(".request-card").filter({ hasText: `${marker} reject` });
  await expect(approvedCard).toHaveCount(1);
  await expect(rejectedCard).toHaveCount(1);
  await expect(approvedCard).toBeVisible(); await expect(rejectedCard).toBeVisible();
  await approvedCard.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("dialog")).toContainText("Approve");
  await page.getByRole("button", { name: "Confirm approve" }).click();
  await expect(approvedCard.locator(".status-badge")).toHaveText("Approved");
  await expect(approvedCard.locator(".status-badge")).toBeFocused();
  await rejectedCard.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByRole("dialog")).toContainText("Reject");
  await page.getByRole("button", { name: "Confirm reject" }).click();
  await expect(rejectedCard.locator(".status-badge")).toHaveText("Rejected");
  await expect(rejectedCard.locator(".status-badge")).toBeFocused();
});
