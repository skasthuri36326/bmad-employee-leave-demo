import { validateLeave } from "../../../lib/leave/validation";

describe("leave request validation", () => {
  const valid = { startDate: "2026-11-15", endDate: "2026-11-15", reason: " Annual leave " };
  it("accepts same-day leave and a trimmed reason", () => expect(validateLeave(valid, "2026-11-15")).toEqual({}));
  it("reports date order and date-in-the-past errors", () => {
    expect(validateLeave({ ...valid, startDate: "2026-11-14", endDate: "2026-11-13" }, "2026-11-15")).toMatchObject({ startDate: expect.any(String), endDate: expect.any(String) });
  });
  it("accepts 500 trimmed characters and rejects blank or 501", () => {
    expect(validateLeave({ ...valid, reason: "x".repeat(500) }, "2026-11-15").reason).toBeUndefined();
    expect(validateLeave({ ...valid, reason: "   " }, "2026-11-15").reason).toMatch(/reason/i);
    expect(validateLeave({ ...valid, reason: "x".repeat(501) }, "2026-11-15").reason).toMatch(/500/);
  });
});
