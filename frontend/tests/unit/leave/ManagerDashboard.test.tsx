import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ManagerDashboard from "../../../components/leave/ManagerDashboard";

const mockRouter = { replace: jest.fn() };
jest.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
function response(body: unknown, status = 200) { return { ok: status >= 200 && status < 300, status, json: async () => body } as Response; }
const pending = { id: "r1", employeeId: "e1", employeeName: "Alex", startDate: "2099-01-01", endDate: "2099-01-02", reason: "Family event", status: "PENDING", createdAt: "2098-01-01T00:00:00Z" };

describe("ManagerDashboard decisions", () => {
  beforeEach(() => { mockRouter.replace.mockClear(); global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/me") return response({ role: "MANAGER" });
    if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
    if (url === "/api/leave-requests" && init?.method !== "POST") return response({ items: [pending] });
    if (url.endsWith("/decision")) return response({ ...pending, status: "APPROVED", decidedAt: "2098-01-02T00:00:00Z" });
    return response({});
  }) as jest.Mock; });

  it("confirms before posting, then replaces actions with saved status and focuses it", async () => {
    render(<ManagerDashboard />);
    await screen.findAllByText("Family event");
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Approve" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Approved the leave request from Alex?");
    expect(global.fetch).not.toHaveBeenCalledWith("/api/leave-requests/r1/decision", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Confirm approve" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/leave-requests/r1/decision", expect.anything()));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(await screen.findByText("Alex was approved.")).toHaveAttribute("role", "status");
    expect(await within(screen.getByRole("table")).findAllByText("Approved")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith("/api/leave-requests/r1/decision", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "X-CSRF-TOKEN": "csrf" }) }));
    await waitFor(() => expect(within(screen.getByRole("table")).getAllByText("Approved")[0]).toHaveFocus());
  });

  it("focuses the saved status in the phone card when the desktop table status is hidden", async () => {
    const previousWidth = window.innerWidth;
    const previousMatchMedia = window.matchMedia;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "matchMedia", { configurable: true, value: jest.fn().mockReturnValue({ matches: true }) });
    try {
      render(<ManagerDashboard />); await screen.findAllByText("Family event");
      fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Approve" }));
      fireEvent.click(screen.getByRole("button", { name: "Confirm approve" }));
      await screen.findByText("Alex was approved.");
      const phoneStatus = document.querySelector(".request-card .status-badge");
      await waitFor(() => expect(phoneStatus).toHaveFocus());
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: previousWidth });
      Object.defineProperty(window, "matchMedia", { configurable: true, value: previousMatchMedia });
    }
  });

  it("closes the confirmation without submitting on cancel", async () => {
    render(<ManagerDashboard />); await screen.findAllByText("Family event");
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Reject" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining("/decision"), expect.anything());
  });

  it("closes on Escape and restores focus to the decision control", async () => {
    render(<ManagerDashboard />); await screen.findAllByText("Family event");
    const approve = within(screen.getByRole("table")).getByRole("button", { name: "Approve" });
    fireEvent.click(approve);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(approve).toHaveFocus());
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining("/decision"), expect.anything());
  });

  it("prevents a second submission while the confirmed decision is pending", async () => {
    let finishDecision!: (result: Response) => void;
    const decisionResponse = new Promise<Response>(resolve => { finishDecision = resolve; });
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/me") return response({ role: "MANAGER" });
      if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
      if (url.endsWith("/decision")) return decisionResponse;
      return response({ items: [pending] });
    });
    render(<ManagerDashboard />); await screen.findAllByText("Family event");
    fireEvent.click(within(screen.getByRole("row", { name: /Family event/ })).getByRole("button", { name: "Approve" }));
    const confirm = screen.getByRole("button", { name: "Confirm approve" });
    fireEvent.click(confirm);
    expect(await screen.findByRole("button", { name: "Saving…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Saving…" }));
    expect((global.fetch as jest.Mock).mock.calls.filter(([url]) => String(url).endsWith("/decision"))).toHaveLength(1);
    finishDecision(response({ ...pending, status: "APPROVED", decidedAt: "2098-01-02T00:00:00Z" }));
    expect(await screen.findByText("Alex was approved.")).toHaveAttribute("role", "status");
  });

  it("routes an expired decision session back to sign-in without announcing success", async () => {
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/me") return response({ role: "MANAGER" });
      if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
      if (url.endsWith("/decision")) return response({ status: 401 }, 401);
      return response({ items: [pending] });
    });
    render(<ManagerDashboard />); await screen.findAllByText("Family event");
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Approve" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm approve" }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText(/was approved/i)).not.toBeInTheDocument();
  });

  it("reports a stale decision without presenting it as saved", async () => {
    let lists = 0;
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/me") return response({ role: "MANAGER" });
      if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
      if (url.endsWith("/decision")) return response({ detail: "Already decided" }, 409);
      lists++;
      return response({ items: [{ ...pending, status: lists === 1 ? "PENDING" : "REJECTED" }] });
    });
    render(<ManagerDashboard />); await screen.findAllByText("Family event");
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Approve" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm approve" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already decided");
    expect(await within(screen.getByRole("table")).findAllByText("Rejected")).toHaveLength(2);
    expect(screen.queryByText(/was approved/i)).not.toBeInTheDocument();
  });

  it("does not claim a stale status refreshed when the follow-up list load fails", async () => {
    let lists = 0;
    const otherPending = { ...pending, id: "r2", reason: "Other event" };
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/me") return response({ role: "MANAGER" });
      if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
      if (url.endsWith("/decision")) return response({ detail: "Already decided" }, 409);
      lists++;
      return lists === 1 ? response({ items: [pending, otherPending] }) : response({ status: 503 }, 503);
    });
    render(<ManagerDashboard />); await screen.findAllByText("Family event");
    fireEvent.click(within(screen.getByRole("row", { name: /Family event/ })).getByRole("button", { name: "Approve" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm approve" }));
    expect(await screen.findByText(/saved status could not be refreshed/i)).toHaveAttribute("role", "alert");
    expect(screen.queryByText(/has been refreshed/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Family event")).not.toBeInTheDocument();
    expect(screen.queryByText("Other event")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByText(/was approved/i)).not.toBeInTheDocument();
  });

  it("keeps the dialog open and announces a failed decision without claiming success", async () => {
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/me") return response({ role: "MANAGER" });
      if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
      if (url.endsWith("/decision")) return response({ detail: "Unavailable" }, 503);
      return response({ items: [pending] });
    });
    render(<ManagerDashboard />); await screen.findAllByText("Family event");
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Reject" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm reject" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The decision was not saved.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Pending")).toBeVisible();
    expect(screen.queryByText(/was rejected/i)).not.toBeInTheDocument();
  });

  it("announces a failed list load", async () => {
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/me") return response({ role: "MANAGER" });
      if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
      return response({ status: 503 }, 503);
    });
    render(<ManagerDashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Leave requests could not be loaded.");
  });

  it("renders the empty state when the assigned request list has no items", async () => {
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/me") return response({ role: "MANAGER" });
      if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
      return response({ items: [] });
    });

    render(<ManagerDashboard />);

    expect(await screen.findByText("There are no leave requests to review.")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("removes a request when the server reports that it is outside the Manager assignment", async () => {
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/me") return response({ role: "MANAGER" });
      if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
      if (url.endsWith("/decision")) return response({ detail: "Not found" }, 404);
      return response({ items: [pending] });
    });
    render(<ManagerDashboard />);
    await screen.findAllByText("Family event");
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Reject" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm reject" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You can’t access this leave request.");
    expect(screen.queryByText("Family event")).not.toBeInTheDocument();
    expect(screen.queryByText(/was rejected/i)).not.toBeInTheDocument();
  });

  it("redirects to sign-in when the session expires during logout", async () => {
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/me") return response({ role: "MANAGER" });
      if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
      if (url === "/api/auth/logout") return response({}, 401);
      return response({ items: [] });
    });
    render(<ManagerDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports a failed logout without redirecting", async () => {
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/me") return response({ role: "MANAGER" });
      if (url === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf" });
      if (url === "/api/auth/logout") return response({}, 503);
      return response({ items: [] });
    });
    render(<ManagerDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sign-out did not complete.");
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });
});
