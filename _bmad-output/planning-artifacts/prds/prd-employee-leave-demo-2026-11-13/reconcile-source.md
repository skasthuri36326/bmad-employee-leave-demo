# Source Reconciliation — Simple Employee Leave Application PRD

**Sources checked:** Original first-pass requirements in the conversation and the PRD workspace `.memlog.md`.

| Source requirement or decision | PRD representation |
|---|---|
| Simple employee leave application for an Employee and Manager | §1 Vision; §2 Target Users; §4 Features. |
| No public registration | FR-2; §6 Non-Goals; §7.2 Out of Scope. |
| Login for two seeded demo users, one Employee and one Manager; role-specific dashboard after sign-in | FR-1 and its acceptance criteria; §4.1 Sign-in and Role-Specific Access; §7.1 In Scope. |
| Employee submits leave dates and a reason | FR-4 and its acceptance criteria; UJ-1. |
| Employee sees own requests and Pending, Approved, or Rejected status; no rejection reason | FR-5; UJ-1; §5.2 Usability and Accessibility. |
| Manager sees assigned Employees' requests and can approve or reject | FR-6 and FR-7; UJ-2. |
| Manager may only view and decide assigned Employees' requests; backend must enforce access | FR-3, FR-6, and FR-7 acceptance criteria; §5.1 Security and Privacy. Direct reads and decisions are explicitly covered. |
| Manager does not enter a rejection reason | FR-7 acceptance criteria; UJ-2; §6 Non-Goals. |
| Include journeys, permissions, acceptance criteria, and out-of-scope items | §2.3 Key User Journeys; FR acceptance criteria and §5.1 permissions; §§6–7 scope. |
| Exclude Admin, Keycloak, notifications, and production deployment | §6 Non-Goals; §7.2 Out of Scope for MVP. |
| Memlog decisions: internal two-account web demo; backend ownership and Assignment enforcement; same-day inclusive dates; decisions only while Pending; Assignment is pre-seeded | §1 and §4.2/4.3; FR-3/5/6/7; Assumptions Index (§10). These are represented as assumptions or testable rules; no conflict found. |

**Result:** No original requirement is missing or contradicted. The PRD distinguishes the stated scope from assumptions and lists the remaining date, reason-length, credential-delivery, and future edit/cancel decisions in §9 Open Questions.
