"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { routeForRole } from "@/lib/auth/role-routing";
import { decideLeaveRequest, LeaveItem, listLeaveRequests } from "@/lib/leave/api";

type Choice = { item: LeaveItem; decision: "APPROVED" | "REJECTED" };
const label = (status: LeaveItem["status"]) => status[0] + status.slice(1).toLowerCase();

export default function ManagerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true), [authorized, setAuthorized] = useState(false);
  const [csrf, setCsrf] = useState(""), [items, setItems] = useState<LeaveItem[]>([]);
  const [loadError, setLoadError] = useState(""), [notice, setNotice] = useState(""), [error, setError] = useState("");
  const [choice, setChoice] = useState<Choice | null>(null), [saving, setSaving] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null), cancelRef = useRef<HTMLButtonElement>(null), triggerRef = useRef<HTMLElement | null>(null);
  const desktopStatusRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const mobileStatusRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  async function refresh(): Promise<boolean> {
    try { setItems(await listLeaveRequests()); setLoadError(""); return true; }
    catch { setLoadError("Leave requests could not be loaded. Please try again."); return false; }
  }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetch("/api/me", { cache: "no-store" });
        if (me.status === 401) { router.replace("/"); return; }
        if (!me.ok) throw new Error();
        const user = await me.json() as { role?: string };
        if (user.role !== "MANAGER") { router.replace(routeForRole(user.role) ?? "/"); return; }
        const tokenResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
        if (!tokenResponse.ok) throw new Error();
        const token = await tokenResponse.json() as { token?: string; headerName?: string };
        if (!token.token || token.headerName !== "X-CSRF-TOKEN") throw new Error();
        if (!cancelled) { setCsrf(token.token); setAuthorized(true); }
        try {
          const initialItems = await listLeaveRequests();
          if (!cancelled) { setItems(initialItems); setLoadError(""); }
        } catch {
          if (!cancelled) setLoadError("Leave requests could not be loaded. Please try again.");
        }
      } catch { if (!cancelled) setError("Your session could not be verified. Please sign in again."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (choice) { cancelRef.current?.focus(); }
  }, [choice]);
  function closeDialog() {
    if (saving) return;
    setChoice(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }
  async function confirm() {
    if (!choice) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const saved = await decideLeaveRequest(choice.item.id, choice.decision, csrf);
      setItems(items.map(item => item.id === choice.item.id ? saved : item));
      setChoice(null);
      setNotice(`${saved.employeeName ?? "Leave request"} was ${label(saved.status).toLowerCase()}.`);
      requestAnimationFrame(() => {
        const isPhone = window.matchMedia?.("(max-width: 48rem)").matches ?? window.innerWidth <= 768;
        (isPhone ? mobileStatusRefs.current : desktopStatusRefs.current)[choice.item.id]?.focus();
      });
    } catch (cause) {
      const status = (cause as Error & { status?: number }).status;
      if (status === 409) {
        setChoice(null);
        const refreshed = await refresh();
        if (refreshed) setError("This request was already decided. The saved status has been refreshed.");
        else {
          setItems([]);
          setError("This request was already decided, but its saved status could not be refreshed. Please refresh the list.");
        }
      } else if (status === 404) {
        setChoice(null); setItems(current => current.filter(item => item.id !== choice.item.id));
        setError("You can’t access this leave request.");
      } else if (status === 401) {
        setChoice(null); router.replace("/");
      } else setError("The decision was not saved. Please try again.");
    } finally { setSaving(false); }
  }
  async function signOut() {
    if (!csrf || saving) return;
    setSaving(true); setError("");
    try { const response = await fetch("/api/auth/logout", { method: "POST", headers: { "X-CSRF-TOKEN": csrf } }); if (response.status === 401 || response.ok) router.replace("/"); else throw new Error(); }
    catch { setError("Sign-out did not complete. Please try again."); }
    finally { setSaving(false); }
  }
  if (loading) return <main className="dashboard-shell"><p role="status">Checking your session…</p></main>;
  if (!authorized) return <main className="dashboard-shell"><section className="dashboard-panel"><h1>Manager area</h1><p className="form-error" role="alert">{error || "Your session could not be verified."}</p><button className="secondary-button" onClick={() => router.replace("/")}>Return to sign in</button></section></main>;
  return <main className="dashboard-shell">
    <header className="dashboard-header"><div><p className="eyebrow">Employee Leave</p><h1>Manager review</h1></div><button className="secondary-button" onClick={signOut} disabled={saving}>Sign out</button></header>
    <section className="dashboard-panel requests-panel" aria-labelledby="manager-requests-heading">
      <div className="section-heading"><h2 id="manager-requests-heading">Leave requests</h2><button className="secondary-button" type="button" onClick={refresh}>Refresh</button></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="feedback-success" role="status">{notice}</p>
      {loadError && <p className="form-error" role="alert">{loadError}</p>}
      {!items.length && !loadError ? <p>There are no leave requests to review.</p> : <>
        <table className="request-table"><thead><tr><th scope="col">Employee</th><th scope="col">Leave dates</th><th scope="col">Reason</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>
          {items.map(item => <tr key={item.id}><td>{item.employeeName}</td><td>{item.startDate === item.endDate ? item.startDate : `${item.startDate} to ${item.endDate}`}</td><td>{item.reason}</td><td><span ref={node => { desktopStatusRefs.current[item.id] = node; }} tabIndex={-1} className={`status-badge status-${item.status.toLowerCase()}`}>{label(item.status)}</span></td><td>{item.status === "PENDING" ? <span className="decision-actions"><button className="primary-button" disabled={saving} onClick={event => { triggerRef.current = event.currentTarget; setChoice({ item, decision: "APPROVED" }); }}>Approve</button><button className="secondary-button" disabled={saving} onClick={event => { triggerRef.current = event.currentTarget; setChoice({ item, decision: "REJECTED" }); }}>Reject</button></span> : <span>{label(item.status)}</span>}</td></tr>)}
        </tbody></table>
        <div className="request-cards">{items.map(item => <article className="request-card" key={item.id}><p><strong>Employee:</strong> {item.employeeName}</p><p><strong>Leave dates:</strong> {item.startDate === item.endDate ? item.startDate : `${item.startDate} to ${item.endDate}`}</p><p><strong>Reason:</strong> {item.reason}</p><p><strong>Status:</strong> <span ref={node => { mobileStatusRefs.current[item.id] = node; }} tabIndex={-1} className={`status-badge status-${item.status.toLowerCase()}`}>{label(item.status)}</span></p>{item.status === "PENDING" && <div className="decision-actions"><button className="primary-button" disabled={saving} onClick={event => { triggerRef.current = event.currentTarget; setChoice({ item, decision: "APPROVED" }); }}>Approve</button><button className="secondary-button" disabled={saving} onClick={event => { triggerRef.current = event.currentTarget; setChoice({ item, decision: "REJECTED" }); }}>Reject</button></div>}</article>)}</div>
      </>}
    </section>
    {choice && <div className="dialog-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="decision-title" aria-describedby="decision-description" className="decision-dialog" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); closeDialog(); } if (event.key === "Tab") { event.preventDefault(); (document.activeElement === cancelRef.current ? confirmRef.current : cancelRef.current)?.focus(); } }}>
      <h2 id="decision-title">Confirm {label(choice.decision).toLowerCase()}</h2><p id="decision-description">{label(choice.decision)} the leave request from {choice.item.employeeName}?</p>
      <div className="dialog-actions"><button ref={cancelRef} className="secondary-button" onClick={closeDialog} disabled={saving}>Cancel</button><button ref={confirmRef} className="primary-button" onClick={confirm} disabled={saving}>{saving ? "Saving…" : `Confirm ${choice.decision === "APPROVED" ? "approve" : "reject"}`}</button></div>
    </section></div>}
  </main>;
}
