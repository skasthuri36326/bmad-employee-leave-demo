import { render, screen, waitFor } from "@testing-library/react";
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
});
