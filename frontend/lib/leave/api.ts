import type { LeaveValues } from "./validation";

export type LeaveItem = { id: string; employeeId?: string; employeeName?: string; startDate: string; endDate: string; reason: string; status: "PENDING" | "APPROVED" | "REJECTED"; createdAt: string; decidedAt?: string | null };
export type Problem = { detail?: string; errors?: Array<{ field: string; message: string }> };

export async function listLeaveRequests(): Promise<LeaveItem[]> {
  const response = await fetch("/api/leave-requests", { cache: "no-store" });
  if (!response.ok) throw new Error("Leave requests could not be loaded.");
  const body = await response.json() as { items?: LeaveItem[] };
  return body.items ?? [];
}

export async function createLeaveRequest(values: LeaveValues, csrf: string): Promise<LeaveItem> {
  const response = await fetch("/api/leave-requests", {
    method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf },
    body: JSON.stringify({ ...values, reason: values.reason.trim() }),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as Problem;
    const error = new Error(problem.detail ?? "Your request could not be submitted.") as Error & { fields?: Problem["errors"] };
    error.fields = problem.errors;
    throw error;
  }
  return response.json() as Promise<LeaveItem>;
}

export async function decideLeaveRequest(id: string, decision: "APPROVED" | "REJECTED", csrf: string): Promise<LeaveItem> {
  const response = await fetch(`/api/leave-requests/${encodeURIComponent(id)}/decision`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf },
    body: JSON.stringify({ decision }),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as Problem;
    const error = new Error(problem.detail ?? "The decision was not saved.") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<LeaveItem>;
}
