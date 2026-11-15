"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { routeForRole } from "@/lib/auth/role-routing";
import { createLeaveRequest, listLeaveRequests, LeaveItem } from "@/lib/leave/api";
import { validateLeave, LeaveValues, LeaveErrors } from "@/lib/leave/validation";

const empty: LeaveValues = { startDate: "", endDate: "", reason: "" };
const labels: Record<keyof LeaveValues, string> = { startDate: "Start date", endDate: "End date", reason: "Reason for requesting leave" };
const statusLabel = (status: LeaveItem["status"]) => status[0] + status.slice(1).toLowerCase();

export default function EmployeeDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false), [csrf, setCsrf] = useState("");
  const [items, setItems] = useState<LeaveItem[]>([]), [values, setValues] = useState<LeaveValues>(empty);
  const [errors, setErrors] = useState<LeaveErrors>({}), [feedback, setFeedback] = useState(""), [failure, setFailure] = useState("");
  const [loading, setLoading] = useState(true), [pending, setPending] = useState(false), [loadError, setLoadError] = useState("");

  async function refresh() {
    try { setItems(await listLeaveRequests()); setLoadError(""); }
    catch { setLoadError("Your leave requests could not be loaded. Please try again."); }
  }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetch("/api/me", { cache: "no-store" });
        if (me.status === 401) { router.replace("/"); return; }
        if (!me.ok) throw new Error();
        const user = await me.json() as { role?: string };
        if (user.role !== "EMPLOYEE") { router.replace(routeForRole(user.role) ?? "/"); return; }
        const tokenResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
        if (!tokenResponse.ok) throw new Error();
        const token = await tokenResponse.json() as { token?: string; headerName?: string };
        if (!token.token || token.headerName !== "X-CSRF-TOKEN") throw new Error();
        if (!cancelled) { setCsrf(token.token); setAuthorized(true); await refresh(); }
      } catch { if (!cancelled) setFailure("Your session could not be verified. Please sign in again."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function signOut() {
    if (!csrf || pending) return;
    setPending(true); setFailure("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", headers: { "X-CSRF-TOKEN": csrf } });
      if (response.status === 401) { router.replace("/"); return; }
      if (!response.ok) throw new Error();
      router.replace("/");
    } catch { setFailure("Sign-out did not complete. Please try again."); }
    finally { setPending(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFeedback(""); setFailure("");
    const nextErrors = validateLeave(values); setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0]; requestAnimationFrame(() => document.getElementById(first)?.focus()); return;
    }
    setPending(true);
    try {
      const created = await createLeaveRequest(values, csrf);
      setItems(current => [created, ...current.filter(item => item.id !== created.id)]);
      setValues(empty); setErrors({}); setFeedback("Leave request submitted with Pending status.");
      await refresh();
    } catch (error) {
      const ex = error as Error & { fields?: Array<{field:string;message:string}> };
      if (ex.fields?.length) {
        const mapped: LeaveErrors = {};
        for (const field of ex.fields) if (field.field in labels) mapped[field.field as keyof LeaveValues] = field.message;
        setErrors(mapped); const first = Object.keys(mapped)[0]; if (first) requestAnimationFrame(() => document.getElementById(first)?.focus());
      } else setFailure("Your request was not submitted. Please check your connection and try again.");
    } finally { setPending(false); }
  }

  if (loading) return <main className="dashboard-shell"><p role="status">Checking your session…</p></main>;
  if (!authorized) return <main className="dashboard-shell"><section className="dashboard-panel"><h1>Employee area</h1><p className="form-error" role="alert">{failure || "Your session could not be verified."}</p><button className="secondary-button" onClick={() => router.replace("/")}>Return to sign in</button></section></main>;

  return <main className="dashboard-shell">
    <header className="dashboard-header"><div><p className="eyebrow">Employee Leave</p><h1>Your leave requests</h1></div><button className="secondary-button" onClick={signOut} disabled={pending}>{pending ? "Please wait…" : "Sign out"}</button></header>
    {failure && <p role="alert" className="form-error">{failure}</p>}
    <div className="dashboard-grid">
      <section className="dashboard-panel" aria-labelledby="request-heading">
        <h2 id="request-heading">Request leave</h2><p className="auth-intro">Choose dates and tell us why you need leave.</p>
        <form onSubmit={submit} noValidate>
          {(["startDate", "endDate", "reason"] as const).map(field => <div className="field-group" key={field}>
            <label htmlFor={field}>{labels[field]} <span>(required)</span></label>
            {field === "reason" ? <textarea id={field} rows={4} required value={values.reason} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `${field}-error` : undefined} onChange={e => setValues({...values, reason:e.target.value})} /> : <input id={field} type="date" required value={values[field]} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `${field}-error` : undefined} onChange={e => setValues({...values, [field]:e.target.value})} />}
            {errors[field] && <span id={`${field}-error`} className="field-error">{errors[field]}</span>}
          </div>)}
          <button className="primary-button" type="submit" disabled={pending}>{pending ? "Submitting…" : "Submit request"}</button>
        </form>
        <p className="feedback-success" role="status">{feedback}</p>
      </section>
      <section className="dashboard-panel requests-panel" aria-labelledby="requests-heading">
        <div className="section-heading"><h2 id="requests-heading">Leave requests</h2><button className="secondary-button" type="button" onClick={refresh}>Refresh</button></div>
        {loadError && <p className="form-error" role="alert">{loadError}</p>}
        {!items.length && !loadError ? <p>You haven’t submitted a leave request.</p> : <>
          <table className="request-table"><thead><tr><th scope="col">Leave dates</th><th scope="col">Reason</th><th scope="col">Status</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{item.startDate === item.endDate ? item.startDate : `${item.startDate} to ${item.endDate}`}</td><td>{item.reason}</td><td><span className={`status-badge status-${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span></td></tr>)}</tbody></table>
          <div className="request-cards">{items.map(item => <article className="request-card" key={item.id}><p><strong>Leave dates:</strong> {item.startDate === item.endDate ? item.startDate : `${item.startDate} to ${item.endDate}`}</p><p><strong>Reason:</strong> {item.reason}</p><p><strong>Status:</strong> <span className={`status-badge status-${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span></p></article>)}</div>
        </>}
      </section>
    </div>
  </main>;
}
