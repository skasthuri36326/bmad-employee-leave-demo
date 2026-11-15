import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmployeeDashboard from "../../../components/leave/EmployeeDashboard";

jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: jest.fn() }) }));

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

async function authenticate(fetchMock: jest.Mock) {
  fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/me") return response({ role: "EMPLOYEE" });
    if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
    if (url === "/api/leave-requests" && init?.method === "POST") return response({ id: "request-1", startDate: "2099-01-01", endDate: "2099-01-01", reason: "Annual leave", status: "PENDING", createdAt: "2098-01-01T00:00:00Z" }, 201);
    return response({ items: [] });
  });
}

describe("EmployeeDashboard submission feedback", () => {
  beforeEach(() => { global.fetch = jest.fn(); });

  it("shows success feedback after a request is saved", async () => {
    const fetchMock = global.fetch as jest.Mock;
    await authenticate(fetchMock);
    render(<EmployeeDashboard />);
    await screen.findByRole("heading", { name: "Your leave requests" });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText(/reason for requesting leave/i), { target: { value: "Annual leave" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByText("Leave request submitted with Pending status.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/api/leave-requests", expect.objectContaining({ method: "POST" }));
    expect(screen.getByLabelText(/reason for requesting leave/i)).toHaveValue("");
  });

  it("shows failure feedback and retains the entered values when saving fails", async () => {
    const fetchMock = global.fetch as jest.Mock;
    await authenticate(fetchMock);
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/me") return response({ role: "EMPLOYEE" });
      if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
      if (url === "/api/leave-requests" && init?.method === "POST") return response({ detail: "The service is unavailable." }, 503);
      return response({ items: [] });
    });
    render(<EmployeeDashboard />);
    await screen.findByRole("heading", { name: "Your leave requests" });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText(/reason for requesting leave/i), { target: { value: "Keep these values" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Your request was not submitted.");
    expect(screen.getByLabelText(/reason for requesting leave/i)).toHaveValue("Keep these values");
    expect(screen.getByRole("button", { name: "Submit request" })).toBeEnabled();
  });

  it("keeps the saved request visible when the follow-up list refresh fails", async () => {
    const fetchMock = global.fetch as jest.Mock;
    let listReads = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/me") return response({ role: "EMPLOYEE" });
      if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
      if (url === "/api/leave-requests" && init?.method === "POST") return response({ id: "request-2", startDate: "2099-01-01", endDate: "2099-01-01", reason: "Saved request", status: "PENDING", createdAt: "2098-01-01T00:00:00Z" }, 201);
      listReads += 1;
      return listReads === 1 ? response({ items: [] }) : response({ detail: "Unavailable" }, 503);
    });
    render(<EmployeeDashboard />);
    await screen.findByRole("heading", { name: "Your leave requests" });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText(/reason for requesting leave/i), { target: { value: "Saved request" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    expect(await screen.findByText("Leave request submitted with Pending status.")).toBeVisible();
    expect(await screen.findByText("Your leave requests could not be loaded. Please try again.")).toBeVisible();
    expect(screen.getAllByText("Saved request").length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/reason for requesting leave/i)).toHaveValue("");
  });
});
