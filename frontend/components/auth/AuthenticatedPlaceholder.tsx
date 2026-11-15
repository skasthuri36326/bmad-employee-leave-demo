"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { routeForRole } from "@/lib/auth/role-routing";

type CsrfResponse = { headerName: "X-CSRF-TOKEN"; token: string };

async function fetchCsrf(): Promise<CsrfResponse> {
  const response = await fetch("/api/auth/csrf", { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error("CSRF request failed");
  const body = await response.json() as CsrfResponse;
  if (body.headerName !== "X-CSRF-TOKEN" || !body.token) throw new Error("Invalid CSRF response");
  return body;
}

export default function AuthenticatedPlaceholder({ role }: { role: "Employee" | "Manager" }) {
  const router = useRouter();
  const [csrf, setCsrf] = useState<CsrfResponse | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function verifySession() {
      try {
        const response = await fetch("/api/me", { method: "GET", cache: "no-store" });
        if (response.status === 401) {
          router.replace("/");
          return;
        }
        if (!response.ok) throw new Error("Session check failed");
        const user = await response.json() as { role?: string };
        const destination = routeForRole(user.role);
        if (!destination) {
          router.replace("/");
          return;
        }
        const expectedRole = role === "Employee" ? "EMPLOYEE" : "MANAGER";
        if (user.role !== expectedRole) {
          router.replace(destination);
          return;
        }
        const token = await fetchCsrf();
        if (!cancelled) {
          setCsrf(token);
          setAuthorized(true);
        }
      } catch {
        if (!cancelled) setError("Your session could not be verified. Please sign in again.");
      }
    }
    void verifySession();
    return () => { cancelled = true; };
  }, [role, router]);

  async function signOut() {
    if (!csrf || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { [csrf.headerName]: csrf.token },
      });
      if (response.status === 401) {
        router.replace("/");
        return;
      }
      if (!response.ok) throw new Error("Logout failed");
      setCsrf(null);
      await fetchCsrf();
      router.replace("/");
    } catch {
      setError("Sign-out did not complete. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card placeholder-card" aria-labelledby="placeholder-title">
        <p className="eyebrow">Employee Leave</p>
        <h1 id="placeholder-title">{authorized ? `${role} area` : "Checking access"}</h1>
        {authorized && <p className="auth-intro">Your {role.toLowerCase()} dashboard will be available in a later story.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {!authorized && !error && <p className="form-status" role="status">Checking your session…</p>}
        {authorized && <button className="secondary-button" type="button" onClick={signOut} disabled={!csrf || pending}>
          {pending ? "Signing out…" : "Sign out"}
        </button>}
        {error && <button className="secondary-button" type="button" onClick={() => router.replace("/")}>Return to sign in</button>}
      </section>
    </main>
  );
}
