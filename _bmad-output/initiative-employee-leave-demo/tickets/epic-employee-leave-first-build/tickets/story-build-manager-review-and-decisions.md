---
id: 5
type: story
title: "Build Manager review and decisions"
parent: epic-employee-leave-first-build
covers: [R4, R5, R6]
after: ["SCRUM-10"]
refined: true
hitl: false
risk: high
tracker_id: "SCRUM-11"
remote: "https://sriramkasthuriuk.atlassian.net/browse/SCRUM-11"
tracker_status: done
---

# Build Manager review and decisions

## Description

The signed-in Manager sees requests from assigned Employees and can decide a Pending request once as Approved or Rejected.

## Requirements

1. **List only assigned requests** (R4, R6)
   **Given** an authenticated Manager has an Employee assignment
   **When** they view `GET /api/leave-requests` in the Manager dashboard
   **Then** each returned request belongs to an Employee assigned to that Manager and includes the Employee name, dates, reason, and status
   **And** the request detail operation returns data only for an assigned Employee
   **And** no employeeId or managerId browser filter can expand the server-derived assignment scope

2. **Decide a Pending request once** (R5, R6)
   **Given** an assigned Employee has a Pending request
   **When** the Manager posts exactly APPROVED or REJECTED to the decision operation
   **Then** Spring Boot atomically records the selected terminal status and decision time
   **And** the response contains no rejection-reason field
   **And** a later or conflicting decision returns 409 and does not overwrite the saved outcome

3. **Enforce Manager authorization on direct requests** (R4, R5, R6)
   **Given** a Manager tries to read or decide a test-only request for an Employee outside their assignment (the demo seed remains one Employee and one Manager)
   **When** the Manager calls the list, detail, or decision API directly or through the proxy
   **Then** the request is excluded or returns the documented non-disclosing 404
   **And** no protected request data is included in the error
   **And** an Employee calling the decision operation receives 403 without changing the request

4. **Move focus to the saved decision** (R5)
   **Given** the Manager is reviewing a Pending request using a keyboard
   **When** the server confirms approval or rejection
   **Then** the decision controls are replaced by the saved status
   **And** focus moves to that request's updated Status and the Status is announced
   **And** failure or stale status is announced without claiming a decision succeeded

5. **Follow the established project structure** (R4, R5, R6)
   **Given** the Story 1.7 structure and Story 1.4 leave persistence are in place
   **When** Manager review and decision behavior is added
   **Then** handwritten Manager code remains in the existing `demo.leave.request` feature packages, new Manager components and helpers go under `frontend/components/leave` and `frontend/lib/leave`, and the page remains at `frontend/app/manager` on the UX-approved `/manager` route
   **And** leave persistence follows the existing Spring JDBC `JdbcTemplate` pattern; JPA and Spring Data JPA are not added
   **And** Java tests remain under `backend/src/test/java`, service unit tests are in corresponding feature packages, and cross-layer/API tests are under `demo.leave.integration.request`
   **And** PostgreSQL integration tests reuse Story 1.4's Testcontainers and migration setup without duplicate container configuration
   **And** Manager Jest tests are under `frontend/tests/unit/leave` and Manager Playwright tests are under `frontend/tests/e2e`
   **And** existing tests are audited against Story 1.7; only misplaced tests are moved, preserving their purpose, cases, assertions, and expected behavior

6. **Save decisions atomically within the Manager's assignment** (R4, R5, R6)
   **Given** a Manager decides a request
   **When** the backend writes the decision
   **Then** that single atomic database write enforces both that the request is still Pending and that its Employee is assigned to the authenticated Manager; a separate assignment check followed by an update is insufficient
   **And** a request outside the assignment returns the contract's non-disclosing 404, while a request that is no longer Pending returns 409 without changing its saved decision
   **And** `decidedAt` is persisted and returned in UTC while preserving the contract's date-time schema and represented instant

7. **Verify decision persistence, authorization, and races** (R4, R5, R6)
   **Given** the Manager decision backend is implemented
   **When** unit and PostgreSQL Testcontainers integration tests run
   **Then** backend tests cover assignment-scoped lists and details, exclusion or non-disclosing 404 for an unassigned Employee's request, successful approval and rejection, persisted decision time, Employee decision attempts returning 403, repeated and conflicting decisions returning 409, and competing decisions where only one wins
   **And** unassigned Employee fixtures are test-only and seeded demo accounts are unchanged
   **And** competing opposite decisions for the same request run in concurrent PostgreSQL Testcontainers transactions; exactly one succeeds, the other receives 409, and the saved status and decision time match the winner and are not overwritten
   **And** Jest tests cover Manager list states, decision controls, updated Status and focus announcements, and failure or stale-decision feedback
   **And** Playwright first creates two fresh, uniquely marked Pending requests through the assigned Employee's flow, then covers Manager sign-in, viewing assigned requests, approving and rejecting those separate requests, and seeing both saved statuses; it does not rely on leftover database rows, clear the database, or alter seeded demo accounts

8. **Verify the complete Manager feature** (R4, R5, R6)
   **Given** the project Compose configuration and verification commands are available
   **When** the developer runs `cd backend && ./mvnw -B verify`, then `cd frontend && npm run test:unit && npm run build`, rebuilds with `docker compose build backend frontend`, starts with `docker compose up -d --force-recreate --wait --wait-timeout 180`, runs `cd frontend && npm run test:e2e` against those ready containers, and then runs `docker compose stop`
   **Then** backend Maven verification, frontend Jest tests, the production build, and Playwright pass
   **And** Maven verification requires Docker for the reused PostgreSQL Testcontainers setup; Docker-free unit tests run without Docker
   **And** all existing and new tests are discovered and pass, existing assertions are preserved, and no test run clears the persistent Compose database

9. **Keep the API aligned with the canonical contract** (R4, R5, R6)
   **Given** Manager requests are read or decided through the API and frontend
   **When** handlers and backend operations implement Manager behavior
   **Then** the canonical OpenAPI contract remains the source of truth and its paths, methods, schemas, security requirements, and documented status/error behavior are unchanged
   **And** no rejection-reason field is added
   **And** the same-origin Next.js proxy for `POST /api/leave-requests/{requestId}/decision` preserves the session cookie, CSRF header, response status, and response body

## References

- parent — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/epic-employee-leave-first-build.md
- prd — _bmad-output/planning-artifacts/prds/prd-employee-leave-demo-2026-11-13/prd.md, FR-6, FR-7, and §5.2
- architecture — _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/ARCHITECTURE-SPINE.md, AD-1, AD-4, AD-5, and AD-8
- api contract — _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml, Manager list/detail and `POST /api/leave-requests/{requestId}/decision`
- predecessor — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/tickets/story-build-employee-leave-submission-and-dashboard.md, Employee request model, persistence, assignment-scoped shared reads, and test conventions
- predecessor — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/tickets/story-refactor-existing-project-structure.md, responsibility packages and existing test discovery conventions
- predecessor — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/tickets/story-add-session-authentication-and-role-lookup.md, approved `/manager` route
- experience — _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/EXPERIENCE.md, Manager review list, Decision controls, State Patterns, and Accessibility Floor
- design — _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/DESIGN.md, Manager review list and Decision controls

## Boundaries

- Must not change: a Manager cannot access an unassigned Employee's request or supply an employee/manager identity to gain authority.
- Must not change: only Pending requests can be decided; no rejection reason or other decision field is introduced.
- Must not change: Story 1.4's persistence and migration setup is reused; no duplicate PostgreSQL Testcontainers configuration is introduced.
- Must not change: the canonical OpenAPI contract's paths, methods, schemas, security requirements, or documented status/error behavior.

## Notes

- Risk: high — an assignment or state-transition defect can expose requests or overwrite a decision. Extra check: race two opposite decisions against the same Pending request and confirm exactly one succeeds while the other receives 409.
- Decision: 2026-11-15 — Keep Manager implementation in the existing request feature packages, use the approved `/manager` route, and reuse Story 1.4's JDBC, PostgreSQL Testcontainers, and migration conventions. Do not change the canonical OpenAPI contract.
