import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignInForm from "../../../components/auth/SignInForm";

const replace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 401) {
  return { ok, status, json: async () => body };
}

describe("SignInForm", () => {
  beforeEach(() => {
    replace.mockReset();
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ headerName: "X-CSRF-TOKEN", token: "pre-login-token" }),
    ) as jest.Mock;
  });

  it("exposes labeled credentials and submits with Enter, then routes by server role", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ headerName: "X-CSRF-TOKEN", token: "pre-login-token" }))
      .mockResolvedValueOnce(jsonResponse({ id: "id", email: "manager@example.test", displayName: "Manager", role: "MANAGER" }));

    render(<SignInForm />);
    const email = await screen.findByRole("textbox", { name: /email/i });
    const password = screen.getByLabelText(/password/i);
    await user.type(email, "manager@example.test");
    await user.type(password, "secret");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/manager"));
    expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/auth/login", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "X-CSRF-TOKEN": "pre-login-token" }),
    }));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("announces a generic credential error and prevents resubmission while pending", async () => {
    let finishLogin!: (value: ReturnType<typeof jsonResponse>) => void;
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ headerName: "X-CSRF-TOKEN", token: "pre-login-token" }))
      .mockImplementationOnce(() => new Promise((resolve) => { finishLogin = resolve; }));
    const user = userEvent.setup();
    render(<SignInForm />);
    await user.type(await screen.findByRole("textbox", { name: /email/i }), "wrong@example.test");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/signing in/i);
    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(global.fetch).toHaveBeenCalledTimes(2);
    finishLogin(jsonResponse({ title: "Unauthorized", status: 401 }, false));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect.");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps the submit action keyboard accessible", async () => {
    render(<SignInForm />);
    expect(await screen.findByRole("button", { name: /sign in/i })).toBeVisible();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("type", "password");
  });

  it("lets the user retry when the initial CSRF request fails", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(jsonResponse({ headerName: "X-CSRF-TOKEN", token: "fresh-token" }));

    render(<SignInForm />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/temporarily unavailable/i);
    await user.click(screen.getByRole("button", { name: /retry secure sign-in/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled());
  });
});
