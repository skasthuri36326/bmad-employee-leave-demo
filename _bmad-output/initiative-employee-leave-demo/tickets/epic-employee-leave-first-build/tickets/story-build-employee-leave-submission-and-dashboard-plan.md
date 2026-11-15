---
title: '1.4 Build Employee leave submission and dashboard'
type: feature
ticket: '4'
created: '2026-11-15'
status: done
baseline_revision: 'NO_VCS'
route: full
route_source: auto
risk: high
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 1
context:
  - _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml
  - _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/DESIGN.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The authenticated Employee route is still a placeholder, so Employees cannot submit leave or review their saved requests.

**Approach:** Implement the Employee leave API and persistence with Spring JDBC and Flyway, plus an accessible request form and scoped request list on the approved `/employee` route. Preserve the OpenAPI contract and Story 1.7 structure, and add unit, PostgreSQL integration, Jest, and Playwright coverage.

## Boundaries & Constraints

**Always:** Derive request ownership from `AppUserPrincipal`; create requests as Pending; apply Europe/London date and trimmed reason rules; use the existing same-origin session/CSRF boundary; run database integration tests against disposable PostgreSQL 18.7 with Flyway; keep unit tests Docker-free; preserve existing test intent/assertions; keep generated API/model source under `target` unchanged.

**Never:** Change the canonical OpenAPI contract; accept a browser-selected owner or initial status; add JPA/Spring Data JPA, weekend/holiday rules, balances, conflict checks, request edits/cancellation, rejection reasons, or a new Employee route. Manager dashboard and decision behavior remain Story 1.5 scope.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid Employee submission | Authenticated Employee, valid dates and reason, CSRF token | 201 response; persisted request belongs to session Employee and is Pending | No owner/status accepted from browser |
| Invalid or out-of-scope request | Invalid dates/reason, or another Employee's request ID | 400 field errors with no row created; out-of-scope detail is a generic 404 | Do not return protected request data |

</frozen-after-approval>

## Code Map

- `backend/src/main/java/demo/leave/user/repository/UserRepository.java` -- constructor-injected `JdbcTemplate` and row-mapping pattern to follow; `auth/security/AppUserPrincipal.java` supplies UUID and role for server-derived ownership.
- `backend/src/main/resources/db/migration/V1__create_demo_account_schema.sql` -- existing PostgreSQL user/assignment schema; add the leave table in the next Flyway migration. `backend/pom.xml` already has JDBC, Flyway, PostgreSQL runtime, and JUnit/MVC/security test dependencies.
- `backend/src/main/java/demo/leave/config/ClockConfiguration.java` supplies the UTC system clock that the service converts to the Europe/London calendar date; `config/StrictJsonConfiguration.java` configures the Jackson 2 converter to reject request fields forbidden by the contract.
- `backend/target/generated-sources/openapi/src/main/java/demo/leave/generated/api/LeaveRequestsApi.java` and generated models -- use the generated request/response models, but do not implement `LeaveRequestsApi` directly: it also declares the Story 1.5 decision operation. Map only create/list/detail in this story; do not edit generated sources. POM generates these under `target`.
- The canonical contract's `CreateLeaveRequest` schema in `contracts/openapi.yaml` sets `additionalProperties: false`; rejecting unknown create fields such as `employeeId` and `status` is contract-aligned.
- `backend/src/main/java/demo/leave/config/security/SecurityConfiguration.java` and `auth/exception/AuthExceptionHandler.java` -- current session, authenticated-POST CSRF, and Problem Details behavior; preserve it while adding role/ownership outcomes.
- `frontend/app/employee/page.tsx` and `components/auth/AuthenticatedPlaceholder.tsx` -- approved route and existing `/api/me`, role-check, CSRF bootstrap, and sign-out behavior. Reuse the authenticated boundary for the Employee dashboard.
- `frontend/app/api/[...path]/route.ts` -- current same-origin proxy forwards cookies, CSRF, body, response status, and Set-Cookie; add the specified leave route handlers using the same forwarding behavior.
- `frontend/app/styles.css`, `frontend/jest.config.cjs`, `frontend/playwright.config.ts`, and `frontend/tests/{unit,e2e}` -- existing visual/focus styles and Story 1.7 test discovery. Existing auth tests are already correctly located; preserve their assertions.
- Canonical contract SHA-256 before changes: `29c929be58d0495626b562755d58043656292e3334dade586d471845905ffcb9`.

## Tasks & Acceptance

**Execution:**
- [x] `backend/src/main/resources/db/migration/V2__create_leave_request_schema.sql` -- add the persisted request fields, owner relationship, and Pending/Approved/Rejected constraints through Flyway.
- [x] `backend/pom.xml`, `backend/Dockerfile` -- add only test-scoped Testcontainers 2.0.5 JUnit/PostgreSQL modules; use `postgres:18.7` in tests. Keep image builds from executing Testcontainers by packaging with tests skipped; Maven verification runs separately on the host with Docker. Add the Jackson 2 runtime libraries required by generated contract models and strict unknown-field handling.
- [x] `backend/src/main/java/demo/leave/request/{model,repository,service,controller}` -- add request domain/repository/service/controller and Problem Details validation. Follow canonical OpenAPI paths, methods, schemas, status/error behavior, and security requirements for create/list/detail without editing the contract. Use generated models, `JdbcTemplate`, Europe/London `Clock` date validation, trimmed 1–500 reason, Pending status, and the authenticated principal's UUID. Reject unknown create fields such as `employeeId` or `status`, as required by `CreateLeaveRequest`'s `additionalProperties: false`; malformed date/JSON errors must identify the relevant field when it can be determined.
- [x] `backend/src/test/java/demo/leave/request/service/LeaveRequestServiceTest.java` and `request/controller/LeaveRequestControllerTest.java` -- add Docker-free tests for date rules, trimming/length, Pending status, and principal-derived ownership.
- [x] `backend/src/test/java/demo/leave/integration/request/LeaveRequestApiIntegrationTest.java` -- use a disposable PostgreSQL 18.7 Testcontainer and Flyway migrations for create/list/detail, persistence, invalid no-row cases, another Employee's non-disclosing 404, and Manager create 403; keep existing tests unchanged.
- [x] Audit all existing backend, Jest, and Playwright tests against Story 1.7's structure. No existing tests were misplaced, so none moved; their purposes, cases, assertions, and behavior remain unchanged. Existing and new suites are discovered by the current configurations.
- [x] `frontend/lib/leave/`, `frontend/app/api/leave-requests/route.ts`, `frontend/app/api/leave-requests/[requestId]/route.ts` -- add leave request helpers and same-origin proxy handlers preserving session/CSRF, response status, headers, and body.
- [x] `frontend/components/leave/`, `frontend/app/employee/page.tsx`, `frontend/lib/leave/validation.ts`, `frontend/tests/unit/leave/` -- replace the Employee placeholder content with an accessible form/list on `/employee`; test validation and success/error feedback without changing the auth/session boundary. A successful create must remain visible and report success even if the follow-up list refresh fails; report load failure without implying the created request failed.
- [x] `frontend/tests/e2e/employee-leave.spec.ts` -- sign in with existing local credentials, capture the request list, verify invalid submission shows a field error and leaves that list unchanged, then submit a valid request with a run-unique marker and assert that exact request appears in the list. Do not clear the persistent developer database for test cleanup.

**Acceptance Criteria:**
- Given an authenticated Employee submits valid input, when the request is saved, then the API returns 201 with trimmed reason and Pending status and the owner is the authenticated principal.
- Given invalid date or reason input, when submitted, then the response/UI identifies the field, no row is created, and the list is unchanged; same-day and 500-character reasons are valid, while whitespace-only and 501-character reasons are invalid.
- Given an Employee lists or retrieves requests, when the API responds, then the list contains only that Employee's requests and another Employee's request ID receives a generic 404 with no request data.
- Given a Manager submits a create request, when authorization is checked, then the API returns 403 and persists no request; employee-supplied owner/status fields are rejected.
- Given an Employee uses the dashboard by keyboard, when the form or list is used, then labels/errors, focus, pending/success/failure feedback, desktop table headers, and mobile labels meet the approved UX.
- Given Maven and frontend verification run, when all existing and new tests execute, then tests are discovered and pass, any moved tests retain their assertions and behavior, and the OpenAPI file hash is unchanged.

## Implementation Notes

The request controller maps only create, list, and detail directly, using generated request/response models; it does not expose the Story 1.5 decision operation. Manager list/detail responses remain within the canonical contract's assignment-scoped API behavior. Request timestamps are normalized to UTC. Malformed JSON/date errors extract a field name from Jackson's mapping exception path without returning parser internals. After a successful create, the dashboard inserts the returned request into its current list before refreshing, so a failed refresh can be reported separately without hiding the saved request or claiming the create failed.

## Plan Change Log

- Plan review: added an explicit audit of all existing backend, Jest, and Playwright test placement and clarified the preservation check; the repository investigation found the current auth tests correctly placed, so moves are limited to any misplaced tests discovered during implementation.
- Plan refinement: made the Playwright request uniquely identifiable and compared the invalid-submit result with a pre-submit list snapshot, without clearing the persistent database. Confirmed the unchanged OpenAPI `CreateLeaveRequest` schema explicitly disallows additional properties, so crafted `employeeId` and `status` fields remain rejected.
- Review loop 1: quick-review finding 3 showed the implementation added Manager decision behavior that the frozen scope reserves for Story 1.5. The human confirmed that decision behavior stays in Story 1.5. Clarified that this story must use generated request/response models without implementing `LeaveRequestsApi`, whose interface also declares the decision operation; expose only create/list/detail here. Preserve the Employee create/list/detail API, ownership and assignment-scoped reads, JDBC/Flyway persistence, validation, proxy behavior, and existing/new test coverage while re-deriving. Avoid a decision transition or decision endpoint in Story 1.4. The same review also identified malformed-body field errors and an Employee dashboard refresh-failure feedback issue; include fixes for those in the re-derived implementation. The known-bad state is an implementation that adds decision behavior or leaves either observed feedback defect.

## Review Triage Log

- bad_plan — Quick review finding 3 was valid: `decideLeaveRequest` added a Manager transition despite Story 1.5 scope, and its lookup/update were not atomic. After the human confirmed decisions remain in Story 1.5, the loopback removed the decision endpoint and transition from Story 1.4 and added explicit create/list/detail mappings using generated models.
- false — Quick review finding 1 did not occur in production because persisted roles are constrained to Employee and Manager; additionally, unsupported-role branches now return Problem Details if reached.
- false — Quick review finding 2 did not occur for anonymous requests because Spring Security rejects them before the controller and returns Problem Details; controller fallback branches now also use the Problem Details handler.
- false — Quick review finding 4 identified an unused unscoped helper; it had no caller and was removed during the scope loopback. Exposed detail reads remain owner- or assignment-scoped.
- patch — Quick review finding 5 was valid: malformed date and unknown-field bodies lacked field errors. The exception advice now has precedence over the framework default and extracts the field from Jackson's mapping path; a PostgreSQL integration test asserts `startDate` and `employeeId` errors and no row creation, and Maven verification passes.
- patch — Quick review finding 6 was valid: successful create plus failed refresh could hide the saved request. The dashboard now displays the POST response before refreshing and reports load failure separately; a Jest test simulates the failed refresh and asserts saved-request visibility, success feedback, and the load error.
- patch — Final quick review found that Java `String.trim()` leaves some Unicode whitespace, so whitespace-only reasons such as em-space plus nonbreaking-space could pass backend validation even though the browser rejects them. The service now trims Unicode whitespace and the Docker-free service test covers both Unicode trimming and rejection; the final Maven verification passes.
- false — Final quick review questioned Manager list/detail support as outside Story 1.4, but the unchanged OpenAPI contract explicitly defines the shared list/detail operations for Managers and requires assignment scoping. The repository queries enforce that assignment, so the behavior is contract-required and does not expose unassigned requests.
- patch — Final quick review found `decidedAt` was not normalized like `createdAt`. The controller now normalizes either timestamp to UTC, and a controller unit test verifies both offsets.
- patch — Quick review found the reason textarea lacked the approved visible keyboard focus ring because the shared selector covered only buttons and inputs. Added `textarea:focus-visible` to the selector; the existing frontend build is the targeted verification for this CSS change.

## Design Notes

The Dockerfile currently runs `mvn verify`; Testcontainers integration tests cannot rely on a Docker daemon inside the image build. Keep test execution in the explicit host-side `./mvnw -B verify` verification step and let image packaging compile tests without running them. Unit tests use mocks and must remain runnable without Docker. Use Testcontainers' test-scoped JUnit Jupiter and PostgreSQL modules; the existing PostgreSQL runtime driver and project Flyway migrations are reused. The Playwright test runs against the rebuilt Compose stack and its PostgreSQL service, not the Testcontainers database.

## Verification

**Commands:**
- `cd backend && ./mvnw -B verify` -- expected: unit and PostgreSQL Testcontainers integration tests pass; Docker is available.
- `cd frontend && npm run test:unit && npm run build` -- expected: all Jest tests pass and Next.js builds.
- From the repository root, `docker compose build backend frontend` then `docker compose up -d --force-recreate --wait --wait-timeout 180` -- expected: both images rebuild and services become healthy.
- `cd frontend && npm run test:e2e` -- expected: the Employee journey passes against the rebuilt Compose containers.
- From the repository root, `docker compose stop` -- expected: all Compose services stop after verification without deleting the database volume.

**Manual checks:**
- Confirm existing test bodies/assertions are unchanged except necessary package/import/discovery edits; all existing and new tests are discovered.
- Confirm the canonical OpenAPI contract SHA-256 remains `29c929be58d0495626b562755d58043656292e3334dade586d471845905ffcb9` and generated Java remains under `backend/target` in its existing packages; do not clear the persistent Compose database as cleanup.
- Final verification passed: backend Maven `verify` (19 tests, 0 failures/errors/skips), Jest (5 suites / 16 tests), Next.js build, Docker Compose image rebuild and healthy startup, and Playwright (2 tests). Maven used the repository-pinned Java through `jenv exec` and a temporary Maven Central mirror settings file because the plain shell Java shim and configured internal Maven mirror were unavailable. The rebuilt Compose services were stopped after E2E; the persistent database volume was retained.
