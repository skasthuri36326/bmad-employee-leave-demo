---
type: epic
title: Employee leave request and approval workflow
parent: initiative-employee-leave-demo
covers: [R1, R2, R3, R4, R5, R6, R7]
sources: []
companions:
  - _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/DESIGN.md
  - _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml
refined: false
risk: high
---

# Employee leave request and approval workflow

## Description

Build the first-pass Employee and Manager leave workflow as one locally runnable system, following the initiative requirements and its adopted UX, architecture, and OpenAPI contracts.

## Outcome

The Employee can request leave and see its saved outcome, and the assigned Manager can decide that request without accessing any request outside the assignment.

## Requirements

1. **Shared sign-in and role dashboard** (parent R1): A person with valid seeded Employee or Manager credentials signs in through one shared login and reaches the dashboard selected by the server-reported role; public registration is unavailable.
2. **Employee leave submission** (parent R2): An Employee submits leave dates and a required trimmed reason; valid requests are created as Pending.
3. **Employee request tracking** (parent R3): An Employee sees only their own dates, reason, and Pending, Approved, or Rejected status; no rejection reason is collected or shown.
4. **Manager assigned-request review** (parent R4): A Manager lists and retrieves only requests belonging to Employees assigned to that Manager.
5. **Manager decisions** (parent R5): An assigned Manager decides a Pending request once as Approved or Rejected; no rejection reason is entered.
6. **Backend authorization** (parent R6): Every protected API operation enforces authenticated role, ownership, and persisted assignment server-side; browser-supplied employee or manager identifiers do not grant access.
7. **Local demo services and data** (parent R7): Docker Compose runs Next.js, Spring Boot, and PostgreSQL with one seeded Employee, one seeded Manager, and their assignment.

## Constraints

- Preserve inclusive calendar-day validation, same-day leave, today-or-later start, end-on-or-after-start, no weekend/holiday rules, and required trimmed reason length 1–500.
- Preserve session-cookie auth, CSRF-protected POST requests, transparent same-origin proxying, server-side role/ownership/assignment enforcement, and the OpenAPI request/response shapes.
- Use local demo credentials outside version control and persist BCrypt hashes only.
- All key flows are keyboard operable with visible logical focus; a successful Manager decision focuses and announces the updated Status.
- Do not add registration, Admin functionality, Keycloak, notifications, manager rejection reasons, or production deployment.

## Done when

- The local Compose stack demonstrates sign-in, role dashboards, request submission, scoped Manager review, and a saved decision.
- Unauthorized direct API reads and decisions are denied without protected request data; status transitions cannot be overwritten.
- Required validation, keyboard behavior, responsive presentation, and the OpenAPI contract are verified in the integrated application.

## Boundaries

This epic owns all first-pass application work. It does not add out-of-scope product features listed by the initiative or implement production operations.

- Must not change: no browser-selected request owner, no Admin or registration path, and no rejection-reason data.

## References

- parent — `_bmad-output/initiative-employee-leave-demo/initiative-employee-leave-demo.md`, Requirements R1–R7 and Constraints
- experience — `_bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/EXPERIENCE.md`
- design — `_bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/DESIGN.md`
- architecture — `_bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/ARCHITECTURE-SPINE.md`
- api contract — `_bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml`

## Notes

- Decision: 2026-11-13 — Tracer bullet: story 1 boots the browser-facing Next.js service, Spring Boot, and PostgreSQL through Compose and verifies the frontend-to-backend-to-database health path. The six-story split follows the user's explicit order; Manager work depends on the Employee request model; integrated verification closes the path.
- Decision: 2026-11-13 — Declined a separate Refactor sweep because the user specified the six story areas; cleanup stays within the owning story and cannot add behavior or scope.
- Decision: 2026-11-15 — Add the user's requested opening structure-only refactor after Story 1.3 and before Story 1.4; Story 1.4 waits on both Story 1.3 and the refactor. Stories 1.5 and 1.6 retain their existing order and dependencies. This does not reopen the earlier decision to decline a separate closing Refactor sweep.
- Decision: 2026-11-15 — The user approved the Story 1.7 package and folder layout; preserve the listed grouping and move-only scope.
- Decision: 2026-11-15 — Refine Story 1.7's handwritten backend package layout into explicit responsibility subpackages for auth, user, security configuration, and readiness, as specified in the story. Keep Story 1.7's scope, dependencies, frontend layout, and the order of Stories 1.4–1.6 unchanged.
- Risk: high — a role or assignment defect could expose or alter leave records. Extra check: review the final direct-API authorization evidence independently of the dashboard walkthrough.
