import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AuthenticatedPlaceholder from "../../../components/auth/AuthenticatedPlaceholder";

const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace };

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 401) {
  return { ok, status, json: async () => body };
}

describe("AuthenticatedPlaceholder", () => {
  beforeEach(() => {
    mockReplace.mockReset();
  });

  it("redirects an anonymous visitor without rendering the role page", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 401)) as jest.Mock;

    render(<AuthenticatedPlaceholder role="Manager" />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("heading", { name: "Manager area" })).not.toBeInTheDocument();
  });

  it("routes an authenticated user to the destination for the server role", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ role: "EMPLOYEE" })) as jest.Mock;

    render(<AuthenticatedPlaceholder role="Manager" />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/employee"));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("loads the sign-out CSRF token only after the server confirms the matching role", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(jsonResponse({ role: "MANAGER" }))
      .mockResolvedValueOnce(jsonResponse({ headerName: "X-CSRF-TOKEN", token: "logout-token" })) as jest.Mock;

    render(<AuthenticatedPlaceholder role="Manager" />);

    expect(await screen.findByRole("heading", { name: "Manager area" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Sign out" })).toBeEnabled();
    expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/me", expect.objectContaining({ cache: "no-store" }));
    expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/auth/csrf", expect.objectContaining({ method: "GET" }));
  });

  it("returns an unknown server role to sign-in", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ role: "ADMIN" })) as jest.Mock;

    render(<AuthenticatedPlaceholder role="Manager" />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("shows a recoverable error when the authenticated session check fails", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, false, 503)) as jest.Mock;

    render(<AuthenticatedPlaceholder role="Employee" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Your session could not be verified.");
    fireEvent.click(screen.getByRole("button", { name: "Return to sign in" }));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("shows a recoverable error when CSRF bootstrap returns an invalid token", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(jsonResponse({ role: "EMPLOYEE" }))
      .mockResolvedValueOnce(jsonResponse({ headerName: "wrong-header", token: "csrf" })) as jest.Mock;

    render(<AuthenticatedPlaceholder role="Employee" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Your session could not be verified.");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("logs out with the session CSRF token and refreshes CSRF before redirecting", async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(jsonResponse({ role: "MANAGER" }))
      .mockResolvedValueOnce(jsonResponse({ headerName: "X-CSRF-TOKEN", token: "logout-token" }))
      .mockResolvedValueOnce(jsonResponse({}, true, 204))
      .mockResolvedValueOnce(jsonResponse({ headerName: "X-CSRF-TOKEN", token: "fresh-token" })) as jest.Mock;
    global.fetch = fetchMock;

    render(<AuthenticatedPlaceholder role="Manager" />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/auth/logout", expect.objectContaining({
      method: "POST", headers: { "X-CSRF-TOKEN": "logout-token" },
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/auth/csrf", expect.objectContaining({ method: "GET" }));
  });

  it("redirects when logout reports an expired session", async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(jsonResponse({ role: "EMPLOYEE" }))
      .mockResolvedValueOnce(jsonResponse({ headerName: "X-CSRF-TOKEN", token: "logout-token" }))
      .mockResolvedValueOnce(jsonResponse({}, false, 401)) as jest.Mock;
    global.fetch = fetchMock;

    render(<AuthenticatedPlaceholder role="Employee" />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the page recoverable when logout fails", async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(jsonResponse({ role: "EMPLOYEE" }))
      .mockResolvedValueOnce(jsonResponse({ headerName: "X-CSRF-TOKEN", token: "logout-token" }))
      .mockResolvedValueOnce(jsonResponse({}, false, 503)) as jest.Mock;
    global.fetch = fetchMock;

    render(<AuthenticatedPlaceholder role="Employee" />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sign-out did not complete.");
    expect(screen.getByRole("button", { name: "Return to sign in" })).toBeVisible();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
