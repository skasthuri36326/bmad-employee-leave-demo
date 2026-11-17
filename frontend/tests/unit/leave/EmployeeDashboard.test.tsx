import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmployeeDashboard from "../../../components/leave/EmployeeDashboard";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: mockReplace }) }));

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
  beforeEach(() => { mockReplace.mockReset(); global.fetch = jest.fn(); });

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

  it("focuses the first invalid field and does not send a request", async () => {
    const fetchMock = global.fetch as jest.Mock;
    await authenticate(fetchMock);
    render(<EmployeeDashboard />);
    await screen.findByRole("heading", { name: "Your leave requests" });

    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    const startDate = screen.getByLabelText(/start date/i);
    expect(await screen.findByText("Enter a start date.")).toBeVisible();
    await waitFor(() => expect(startDate).toHaveFocus());
    expect(fetchMock).not.toHaveBeenCalledWith("/api/leave-requests", expect.objectContaining({ method: "POST" }));
  });

  it("routes a signed-in Manager away from the Employee dashboard", async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ role: "MANAGER" })) as jest.Mock;

    render(<EmployeeDashboard />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/manager"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your session could not be verified.");
  });

  it("shows an authentication error if CSRF bootstrap fails", async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(response({ role: "EMPLOYEE" }))
      .mockResolvedValueOnce(response({}, 503)) as jest.Mock;
    global.fetch = fetchMock;

    render(<EmployeeDashboard />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Your session could not be verified.");
    expect(fetchMock.mock.calls.slice(0, 2).map(([url]) => url)).toEqual(["/api/me", "/api/auth/csrf"]);
    expect(screen.queryByRole("heading", { name: "Your leave requests" })).not.toBeInTheDocument();
  });

  it("maps server validation errors to known fields and focuses the first one", async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/me") return response({ role: "EMPLOYEE" });
      if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
      if (url === "/api/leave-requests" && init?.method === "POST") return response({
        detail: "One or more fields are invalid.",
        errors: [
          { field: "startDate", message: "Server rejected this start date." },
          { field: "unknownField", message: "Ignore unknown server fields." },
        ],
      }, 400);
      return response({ items: [] });
    }) as jest.Mock;
    global.fetch = fetchMock;
    render(<EmployeeDashboard />);
    await screen.findByRole("heading", { name: "Your leave requests" });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText(/reason for requesting leave/i), { target: { value: "Annual leave" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    const startDate = screen.getByLabelText(/start date/i);
    expect(await screen.findByText("Server rejected this start date.")).toBeVisible();
    await waitFor(() => expect(startDate).toHaveFocus());
    expect(screen.queryByText("Ignore unknown server fields.")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/leave-requests", expect.objectContaining({ method: "POST" }));
  });

  it("recovers from a failed list load when the user refreshes", async () => {
    let listReads = 0;
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/me") return response({ role: "EMPLOYEE" });
      if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
      listReads += 1;
      return listReads === 1 ? response({}, 503) : response({ items: [] });
    }) as jest.Mock;
    global.fetch = fetchMock;
    render(<EmployeeDashboard />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Your leave requests could not be loaded.");
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByText("You haven’t submitted a leave request.")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
