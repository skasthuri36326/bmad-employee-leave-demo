import { createLeaveRequest, decideLeaveRequest, listLeaveRequests, type LeaveItem } from "../../../lib/leave/api";

const saved: LeaveItem = {
  id: "request-1",
  startDate: "2099-01-01",
  endDate: "2099-01-01",
  reason: "Annual leave",
  status: "PENDING",
  createdAt: "2098-01-01T00:00:00Z",
};

function response(body: unknown, status = 200, malformed = false): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: malformed ? async () => { throw new Error("Invalid JSON"); } : async () => body,
  } as Response;
}

describe("leave API client", () => {
  beforeEach(() => { global.fetch = jest.fn(); });

  it("returns an empty list when the response omits items and disables caching", async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue(response({}));

    await expect(listLeaveRequests()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith("/api/leave-requests", { cache: "no-store" });
  });

  it("throws when the list endpoint rejects the request", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response({}, 503));

    await expect(listLeaveRequests()).rejects.toThrow("Leave requests could not be loaded.");
  });

  it("trims the reason and sends the CSRF token when creating a request", async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue(response(saved, 201));

    await expect(createLeaveRequest({ startDate: saved.startDate, endDate: saved.endDate, reason: "  Annual leave  " }, "csrf")).resolves.toEqual(saved);
    expect(fetchMock).toHaveBeenCalledWith("/api/leave-requests", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": "csrf" },
      body: JSON.stringify({ startDate: saved.startDate, endDate: saved.endDate, reason: "Annual leave" }),
    }));
  });

  it("preserves validation fields from a Problem Details create response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response({
      detail: "One or more fields are invalid.",
      errors: [{ field: "startDate", message: "Start date is invalid." }],
    }, 400));

    await expect(createLeaveRequest({ startDate: "", endDate: "", reason: "" }, "csrf"))
      .rejects.toMatchObject({ message: "One or more fields are invalid.", fields: [{ field: "startDate", message: "Start date is invalid." }] });
  });

  it("uses a generic create error when an error response is not JSON", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response({}, 503, true));

    await expect(createLeaveRequest({ startDate: "", endDate: "", reason: "" }, "csrf"))
      .rejects.toThrow("Your request could not be submitted.");
  });

  it("encodes the request ID and preserves a decision error status", async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue(response({ detail: "Already decided" }, 409));

    await expect(decideLeaveRequest("id/with spaces", "REJECTED", "csrf"))
      .rejects.toMatchObject({ message: "Already decided", status: 409 });
    expect(fetchMock).toHaveBeenCalledWith("/api/leave-requests/id%2Fwith%20spaces/decision", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": "csrf" },
      body: JSON.stringify({ decision: "REJECTED" }),
    }));
  });

  it("uses a generic decision error when the error response is not JSON", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response({}, 503, true));

    await expect(decideLeaveRequest("request-1", "APPROVED", "csrf"))
      .rejects.toMatchObject({ message: "The decision was not saved.", status: 503 });
  });
});
