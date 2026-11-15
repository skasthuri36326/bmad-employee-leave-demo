# PRD Update Reconciliation

Compared the latest user decisions and PRD `.memlog.md` entries with the revised PRD.

| Decision | PRD location | Result |
|---|---|---|
| Leave is counted in inclusive calendar days; same-day requests are valid; start date is today or later; end date is on or after start; no weekend or public-holiday adjustment | §4.2 FR-4 acceptance criteria; UJ-1 edge case | Represented explicitly and testably. |
| Reason is required, trimmed, and 1–500 characters after trimming; whitespace-only input is invalid | §4.2 FR-4 acceptance criteria; UJ-1 edge case | Represented explicitly; invalid requests create no record. |
| Seeded credentials are local and outside the repository; password hashes only; no credential secrets committed | §4.1 FR-1 acceptance criteria; §5.1 Security and Privacy | Represented explicitly, including evaluator provisioning through local demo setup. |
| Every control is keyboard reachable and operable; flows work without a pointer; focus is visible and logical; after Manager decision focus moves predictably to updated Status | §5.2 Usability and Accessibility | Represented explicitly. |
| No public registration, Admin, or rejection reason | FR-2; FR-5 and FR-7 acceptance criteria; §6 Non-Goals; §7.2 Out of Scope | Preserved explicitly. |
| Submitted request editing/cancellation is deferred | §7.2 Out of Scope; §9 Open Questions | Explicitly out of scope, so it is not an unresolved first-pass decision. |

**Open items:** None for the first-pass scope. §9 states none; the previous date, reason-length, and credential-handling questions are resolved by the decisions above. No conflict with prior decisions was found.
