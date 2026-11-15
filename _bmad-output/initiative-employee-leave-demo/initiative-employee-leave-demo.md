---
type: initiative
title: Employee Leave Demo First Build
parent: none
sources:
  - _bmad-output/planning-artifacts/prds/prd-employee-leave-demo-2026-11-13/prd.md
  - _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/EXPERIENCE.md
  - _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml
companions:
  - _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/DESIGN.md
  - _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml
risk: high
---

# Employee Leave Demo First Build

## Description

Deliver a local employee leave demo in which one seeded Employee submits and tracks leave and one assigned Manager reviews and decides it, with Spring Boot enforcing every protected API boundary. This initiative derives from the approved PRD and adopts the approved UX and architecture contracts.

## Outcome

The Employee can submit leave and see its final status while the Manager can decide only assigned requests, demonstrating the PRD's successful-request journey and backend authorization counter-measure.

## Requirements

1. **Shared sign-in and role dashboard** (prd FR-1, FR-2; experience Foundation): A person with valid seeded Employee or Manager credentials signs in through one shared login and reaches the dashboard selected by the server-reported role; public registration is unavailable.
2. **Employee leave submission** (prd FR-4): An Employee submits leave dates and a required trimmed reason; valid requests are created as Pending.
3. **Employee request tracking** (prd FR-5): An Employee sees only their own dates, reason, and Pending, Approved, or Rejected status; no rejection reason is collected or shown.
4. **Manager assigned-request review** (prd FR-6): A Manager lists and retrieves only requests belonging to Employees assigned to that Manager.
5. **Manager decisions** (prd FR-7): An assigned Manager decides a Pending request once as Approved or Rejected; no rejection reason is entered.
6. **Backend authorization** (prd FR-3 and §5.1): Every protected API operation enforces authenticated role, ownership, and persisted assignment server-side; browser-supplied employee or manager identifiers do not grant access.
7. **Local demo services and data** (prd §7.1; architecture AD-6): Docker Compose runs Next.js, Spring Boot, and PostgreSQL with one seeded Employee, one seeded Manager, and their assignment.

## Constraints

- **Calendar and reason validation** (prd FR-4): Dates are inclusive calendar days, start today or later, end on or after start, same-day is allowed, and weekends/public holidays have no special rules. Reason is required, trimmed, and 1–500 characters.
- **Authentication boundary** (architecture AD-1 through AD-3): Spring Security session auth uses an HttpOnly cookie and CSRF on POST requests. Next.js is a transparent same-origin proxy; `GET /api/me` supplies role display context only.
- **Credential handling** (prd FR-1 and architecture AD-6): Demo credentials remain in local configuration outside the repository; PostgreSQL stores BCrypt hashes only.
- **Accessibility** (prd §5.2 and UX Accessibility Floor): All controls work by keyboard, focus is visible and logical, and a Manager decision moves focus to and announces the updated Status.
- **Explicit exclusions** (prd §6–7): No registration, Admin functionality, Keycloak, notifications, manager rejection reasons, or production deployment.

## Done when

- The three local services start through Compose and expose the seeded Employee and Manager demo flows without committing secrets.
- The Employee submits an eligible request and sees its dates, reason, and Pending status, then sees its saved Approved or Rejected status.
- The Manager reviews and decides an assigned Employee's request; a repeated or stale decision leaves the saved outcome unchanged.
- Direct API authorization checks prove an Employee cannot read another Employee's request and a Manager cannot read or decide an unassigned request.
- The login, request, review, and decision journeys work by keyboard with visible focus and predictable post-decision focus.

## Boundaries

This single epic owns the first-build application end to end. Registration, Admin screens or APIs, account/assignment management, notifications, rejection explanations, request editing/cancellation, leave balances, policy rules, and production deployment are outside this initiative.

- Touch point: Next.js frontend and same-origin proxy — owned by `epic-employee-leave-first-build`.
- Touch point: Spring Boot API, Spring Security, and persistence — owned by `epic-employee-leave-first-build`.
- Touch point: PostgreSQL schema and local seed — owned by `epic-employee-leave-first-build`.
- Tracer path: Browser → Next.js → Spring Boot → PostgreSQL → scoped response to the signed-in role.

## References

- prd — `_bmad-output/planning-artifacts/prds/prd-employee-leave-demo-2026-11-13/prd.md`, FR-1 through FR-7 and §§5–7
- experience — `_bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/EXPERIENCE.md`, Foundation, State Patterns, Key Flows, Accessibility Floor
- design — `_bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/DESIGN.md`, responsive layouts and accessible focus/status treatment
- architecture — `_bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/ARCHITECTURE-SPINE.md`, AD-1 through AD-8 and Deployment & Operations Envelope
- api contract — `_bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml`

## Notes

- Decision: 2026-11-13 — Use one epic because the first pass is a tightly coupled workflow sharing one application and local deployment boundary.
- Decision: 2026-11-13 — Keep the user's six story areas in the stated order; decline a separate Refactor sweep and keep cleanup within each owning story.
- Risk: high — an authorization defect could expose employee leave data across users. Extra check: independently review the authorization matrix against every protected OpenAPI operation before the first build starts.
