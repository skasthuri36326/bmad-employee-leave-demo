"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { routeForRole } from "@/lib/auth/role-routing";

type CsrfResponse = { headerName: "X-CSRF-TOKEN"; token: string };
type LoginResponse = { role?: string };

async function fetchCsrf(): Promise<CsrfResponse> {
  const response = await fetch("/api/auth/csrf", { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error("CSRF request failed");
  const body = await response.json() as CsrfResponse;
  if (body.headerName !== "X-CSRF-TOKEN" || !body.token) throw new Error("Invalid CSRF response");
  return body;
}

export default function SignInForm() {
  const router = useRouter();
  const [csrf, setCsrf] = useState<CsrfResponse | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csrfUnavailable, setCsrfUnavailable] = useState(false);

  const refreshCsrf = useCallback(async () => {
    try {
      const next = await fetchCsrf();
      setCsrf(next);
      setCsrfUnavailable(false);
      return next;
    } catch (failure) {
      setCsrf(null);
      setCsrfUnavailable(true);
      throw failure;
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchCsrf().then((next) => {
      if (!active) return;
      setCsrf(next);
      setCsrfUnavailable(false);
    }).catch(() => {
      if (!active) return;
      setCsrf(null);
      setCsrfUnavailable(true);
      setError("Sign-in is temporarily unavailable. Please try again.");
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !csrf) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", [csrf.headerName]: csrf.token },
        body: JSON.stringify({ email, password }),
      });
      if (response.status === 401) {
        setError("Email or password is incorrect.");
        return;
      }
      if (!response.ok) throw new Error("Login failed");

      const user = await response.json() as LoginResponse;
      const destination = routeForRole(user.role);
      if (!destination) {
        setError("Sign-in is temporarily unavailable. Please try again.");
        return;
      }
      router.replace(destination);
    } catch {
      setError("Sign-in is temporarily unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function retryCsrf() {
    setError(null);
    try {
      await refreshCsrf();
    } catch {
      setError("Sign-in is temporarily unavailable. Please try again.");
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="sign-in-title">
        <p className="eyebrow">Employee Leave</p>
        <h1 id="sign-in-title">Sign in</h1>
        <p className="auth-intro">Use your seeded Employee or Manager account.</p>
        <form onSubmit={submit} aria-describedby={error ? "sign-in-error" : undefined}>
          <div className="field-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="field-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
            />
          </div>
          {error && <p id="sign-in-error" className="form-error" role="alert" aria-live="assertive">{error}</p>}
          {csrfUnavailable && <button className="secondary-button" type="button" onClick={retryCsrf}>Retry secure sign-in</button>}
          {pending && <p className="form-status" role="status" aria-live="polite">Signing in…</p>}
          {!csrf && !error && <p className="form-status" role="status" aria-live="polite">Preparing secure sign-in…</p>}
          <button className="primary-button" type="submit" disabled={pending || !csrf}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
