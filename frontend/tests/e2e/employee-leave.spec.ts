import { expect, test } from "@playwright/test";

test("Employee sees field validation and a saved leave request", async ({ page }) => {
  const email = process.env.DEMO_EMPLOYEE_EMAIL;
  const password = process.env.DEMO_EMPLOYEE_PASSWORD;
  const manifest = JSON.parse(process.env.E2E_MANIFEST ?? "{}") as { marker?: string };
  if (!email || !password || !manifest.marker) throw new Error("Runtime Employee credentials and the E2E manifest are required.");
  await page.goto("/");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/employee$/);
  const list = page.getByRole("region", { name: "Leave requests" });
  const before = await list.innerText();
  await page.getByLabel(/start date/i).fill("1900-01-01");
  await page.getByLabel(/end date/i).fill("1900-01-01");
  await page.getByLabel(/reason for requesting leave/i).fill("Invalid journey marker");
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByText(/Start date must be today or later/i)).toBeVisible();
  expect(await list.innerText()).toBe(before);

  const validStart = new Date(); validStart.setUTCDate(validStart.getUTCDate() + 10);
  const validDate = validStart.toISOString().slice(0, 10);
  await page.getByLabel(/start date/i).fill(validDate);
  await page.getByLabel(/end date/i).fill(validDate);
  await page.getByLabel(/reason for requesting leave/i).fill("");
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByText("Enter a reason for requesting leave.")).toBeVisible();
  expect(await list.innerText()).toBe(before);

  const start = new Date(); start.setUTCDate(start.getUTCDate() + 20);
  const date = start.toISOString().slice(0, 10);
  const marker = `E2E employee ${manifest.marker}`;
  await page.getByLabel(/start date/i).fill(date);
  await page.getByLabel(/end date/i).fill(date);
  await page.getByLabel(/reason for requesting leave/i).fill(marker);
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByRole("status").filter({ hasText: /submitted with Pending status/i })).toBeVisible();
  await expect(list.getByRole("cell", { name: marker, exact: true })).toBeVisible();
  await expect(list.getByRole("row").filter({ hasText: marker }).getByRole("cell", { name: "Pending", exact: true })).toBeVisible();
});
