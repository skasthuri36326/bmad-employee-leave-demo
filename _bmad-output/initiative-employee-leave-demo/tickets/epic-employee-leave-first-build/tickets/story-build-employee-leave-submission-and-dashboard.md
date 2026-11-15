---
id: 4
type: story
title: "Build Employee leave submission and dashboard"
parent: epic-employee-leave-first-build
covers: [R2, R3, R6]
after: [3, 7]
refined: true
hitl: false
risk: high
---

# Build Employee leave submission and dashboard

## Description

The signed-in Employee submits a valid leave request and sees only their own requests, reason, dates, and status.

## Requirements

1. **Submit a valid Employee request** (R2)
   **Given** an authenticated Employee enters a start date, end date, and reason that pass validation
   **When** they submit the request
   **Then** the backend binds it to the authenticated Employee and creates it as Pending
   **And** the response exposes the request's dates, trimmed reason, and status without accepting an owner or initial status from the browser

2. **Apply the approved date and reason rules** (R2)
   **Given** an Employee enters leave dates and a reason
   **When** the server validates the submission
   **Then** the start date must be today or later in the configured Europe/London demo timezone, the end date must be on or after the start, and both dates count inclusively
   **And** same-day leave is valid and weekends and public holidays have no special treatment
   **And** the reason is trimmed and must contain 1–500 characters
   **And** invalid dates, empty trimmed reason, or a reason over 500 characters return field errors and create no request

3. **Show only the Employee's requests** (R3, R6)
   **Given** the Employee is authenticated and has requests, including test-only data owned by another Employee
   **When** they view or retrieve requests through the UI or call `GET /api/leave-requests` or `GET /api/leave-requests/{requestId}` directly
   **Then** the list contains only their own requests with dates, reason, and Pending, Approved, or Rejected status
   **And** requesting a request owned by another Employee returns the documented non-disclosing 404 without request data
   **And** the Employee cannot create a request for another person or call the Manager decision operation successfully
   **And** an authenticated Manager calling `POST /api/leave-requests` receives 403 and creates no request

4. **Complete the request form accessibly** (R2, R3)
   **Given** the Employee opens the request form or submits valid or invalid data
   **When** they use the form and view their request list
   **Then** each required field has a persistent label and is identified as required in text and programmatically
   **And** invalid values are retained, field errors are shown and associated with invalid fields, and focus moves to the first invalid field
   **And** repeat submission is prevented while saving; on success, the Employee returns to the dashboard, sees the new Pending request, and receives visible polite confirmation
   **And** on service failure, entered values are retained, success is not claimed, and visible assertive feedback and a retry path are provided
   **And** the request list has a semantic table with associated headers on desktop and labeled request groups on phones; an empty list explains that no request has been submitted and provides the request action
   **And** all controls work by keyboard in logical order with visible focus

5. **Follow the established project structure and preserve existing tests** (R2, R3, R6)
   **Given** the Story 1.7 structure is in place and existing backend, Jest, and Playwright tests are present
   **When** all existing tests are audited against the Story 1.7 structure and this feature and its tests are added
   **Then** handwritten Java request code follows the responsibility package layout recorded in Notes and Java tests remain under Maven's standard test source tree
   **And** leave persistence uses the existing Spring JDBC `JdbcTemplate` approach
   **And** Java unit or slice tests are package-aligned with the production code, while tests that exercise real JDBC queries, PostgreSQL behavior, persistence, mappings, or migrations are integration tests in the location recorded in Notes
   **And** service unit tests that mock the repository are kept with the service tests; focused repository tests that do not need database integration may use a repository test package
   **And** JPA and Spring Data JPA are not added; an empty repository test package is removed unless it contains a meaningful non-integration test
   **And** database-backed tests use a disposable PostgreSQL Testcontainer matching the project's pinned PostgreSQL version and apply the project migrations; an existing Testcontainers setup is reused, with only test-scoped dependencies or configuration added if needed
   **And** unit tests do not require Docker
   **And** the Employee page stays at the approved `/employee` route, Next.js pages and same-origin leave API handlers stay in the App Router, and leave components, helpers, unit tests, and Playwright tests follow the locations recorded in Notes
   **And** any existing misplaced tests are moved to their appropriate folders, while every existing test retains its purpose, cases, assertions, and expected behavior; package declarations, imports, and discovery configuration change only as needed
   **And** Maven, Jest, and Playwright discover the existing and new tests

6. **Keep the leave API aligned with the canonical contract** (R2, R3, R6)
   **Given** the browser submits or reads leave requests through Next.js
   **When** the same-origin API handlers forward requests to Spring Boot
   **Then** the handlers proxy `POST` and `GET /api/leave-requests` and `GET /api/leave-requests/{requestId}` without changing the OpenAPI paths, methods, request/response schemas, security requirements, or documented status and error behavior
   **And** the create operation returns 201, invalid requests return 400 field errors, unauthenticated requests return 401, a Manager creating a request returns 403, and an out-of-scope detail request returns the documented non-disclosing 404
   **And** the canonical OpenAPI contract is unchanged and generated Java sources remain in their existing generated packages and output location

7. **Verify the Employee leave journey and feature rules** (R2, R3, R6)
   **Given** the project Docker Compose configuration is available from the repository root
   **When** the developer rebuilds and starts the application with Compose, waits for services to be ready, runs Playwright against those rebuilt containers, and stops the Compose stack after verification
   **Then** backend tests cover date rules, reason trimming and length, Pending status, and server-derived ownership, and integration tests cover create/list/detail, persistence, invalid requests creating no record, cross-Employee detail returning 404, and Manager create returning 403
   **And** Jest tests cover form validation and success/error feedback
   **And** Playwright covers Employee sign-in, an invalid submission after which the field error appears and the request list remains unchanged, and a valid submission that appears in the Employee's list
   **And** `cd backend && ./mvnw -B verify` requires Docker to run the PostgreSQL Testcontainers tests; `cd frontend && npm run test:unit && npm run build` passes, followed by `cd frontend && npm run test:e2e` against the rebuilt Compose stack, not the Testcontainers database
   **And** moved tests retain their existing assertions, all existing and new tests are discovered and pass, and the canonical OpenAPI contract remains unchanged

## References

- parent — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/epic-employee-leave-first-build.md, Requirements R2, R3, R6 and Constraints
- predecessor — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/tickets/story-add-session-authentication-and-role-lookup.md, authenticated Employee role and `/employee` route
- predecessor — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/tickets/story-refactor-existing-project-structure.md, responsibility packages and test discovery conventions
- prd — _bmad-output/planning-artifacts/prds/prd-employee-leave-demo-2026-11-13/prd.md, FR-4, FR-5, and §5.2
- architecture — _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/ARCHITECTURE-SPINE.md, AD-1, AD-4, AD-5, AD-7, and AD-8
- api contract — _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml, `POST /api/leave-requests`, `GET /api/leave-requests`, `GET /api/leave-requests/{requestId}`, and the Manager decision operation
- experience — _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/EXPERIENCE.md, Employee dashboard, Request form, Employee request list, State Patterns, UJ-1, and Accessibility Floor
- design — _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/DESIGN.md, Request form and Employee request list

## Boundaries

- Must not change: the Employee cannot select an owner, set status, edit/cancel a submitted request, or view a rejection reason.
- Must not change: no weekend, public-holiday, leave-balance, conflict, or approval-chain policy is applied.
- Must not change: the canonical OpenAPI contract or generated Java source packages and output location recorded in Notes.
- Must not change: existing tests' purpose, cases, assertions, or expected behavior; feature coverage is additive.

## Notes

- Decision: 2026-11-15 — Keep the existing `/employee` route approved by Story 1.3 and the Employee UX; do not add a new route for the request form.
- Decision: 2026-11-15 — The current audit found existing handwritten Java, Jest, and Playwright tests in the Story 1.7 structure. Move tests only if a further audit finds any misplaced files.
- Decision: 2026-11-15 — The current backend audit found no Testcontainers setup; PostgreSQL is pinned to 18.7 in Compose, which is the version database-backed tests must use.
- Decision: 2026-11-15 — Implement leave persistence with Spring JDBC `JdbcTemplate`, following the existing `UserRepository` pattern; do not add JPA or Spring Data JPA.
- Risk: high — an owner-binding or authorization defect could expose another Employee's data. Extra check: submit a crafted body with an `employeeId` and confirm it is rejected without creating a request.

The feature and test files follow this structure:

```text
backend/src/main/java/demo/leave/
  LeaveApplication.java
  request/
    controller/
    service/
    model/
    repository/

backend/src/test/java/demo/leave/
  request/
    controller/
    service/
  integration/request/

frontend/
  app/employee/page.tsx
  app/api/leave-requests/route.ts
  app/api/leave-requests/[requestId]/route.ts
  components/leave/
  lib/leave/
  tests/unit/leave/
  tests/e2e/
```

The Next.js leave handlers are same-origin proxies. The OpenAPI contract remains the source of truth for their methods, schemas, security, and response behavior.
Create `backend/src/test/java/demo/leave/request/repository/` only when it contains a meaningful repository test that does not require database integration; otherwise remove or do not create that empty folder.

The backend implementation uses Spring JDBC `JdbcTemplate` following `backend/src/main/java/demo/leave/user/repository/UserRepository.java`. Keep service tests that mock the repository with service tests. Put integration tests that exercise the database under `backend/src/test/java/demo/leave/integration/request/`, optionally in its `repository/` subfolder. If a focused non-integration repository test is needed, its package is `demo.leave.request.repository`.

Use Maven's standard `backend/src/test/java` tree. New Jest tests go in `frontend/tests/unit/leave/`; Playwright tests go in `frontend/tests/e2e/`. Keep the employee page at `frontend/app/employee/page.tsx` and the leave API handlers at `frontend/app/api/leave-requests/route.ts` and `frontend/app/api/leave-requests/[requestId]/route.ts`.

Generated Java remains under `backend/target/generated-sources/openapi` in `demo.leave.generated.api` and `demo.leave.generated.model`.
