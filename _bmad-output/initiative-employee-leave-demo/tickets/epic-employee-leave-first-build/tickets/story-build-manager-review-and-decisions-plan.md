---
title: '1.5 Build Manager review and decisions'
type: feature
ticket: '5'
created: '2026-11-15'
status: done
baseline_revision: 'NO_VCS'
route: full
route_source: auto
risk: high
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context:
  - _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml
  - _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/DESIGN.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Manager page is a placeholder, so assigned Managers cannot review or decide requests safely under concurrent decisions.

**Approach:** Add the assignment-scoped Manager dashboard and decision operation using one atomic assignment-and-Pending update. Reuse JDBC, Flyway, Testcontainers, the session/CSRF proxy, and Story 1.7 test conventions.

## Boundaries & Constraints

**Always:** Keep `/manager`, the existing request feature packages, and UI code in `frontend/components/leave` and `frontend/lib/leave`. Enforce role and assignment server-side; atomically require Pending status and the Manager's assignment. Preserve the `decidedAt` instant in UTC. Use test-only unassigned Employees and unique Playwright markers; preserve existing assertions and workspace changes.

**Decision (2026-11-15):** Use a confirmation dialog before saving Approve or Reject, following the UX assumption. Cancel closes without submitting; Confirm submits. The dialog receives and contains focus. On success it closes, the controls are replaced by the saved status, and focus moves to that status. On failure or stale status, announce the error without implying success.

**Never:** Change OpenAPI or generated source, duplicate Story 1.4 migrations/Testcontainers, add JPA/rejection reasons/routes, use a separate assignment check before updating, clear Compose data, or alter seeded accounts.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Assigned Pending decision | Manager chooses APPROVED or REJECTED | Atomic write saves one terminal status and UTC decision time; response is ManagerLeaveRequest | No rejection-reason field |
| Out of scope or stale | Unassigned/missing request, or already decided request | No write; missing/out-of-scope is non-disclosing 404; assigned stale request is 409 | Never expose protected request data or overwrite the winner |
| Concurrent opposite decisions | Two transactions decide the same Pending request | Exactly one succeeds; the other gets 409; stored status/time match winner | No later overwrite |

</frozen-after-approval>

## Code Map

- `LeaveRequestController`, `LeaveRequestService`, and `LeaveRequestRepository` under `backend/src/main/java/demo/leave/request/` -- manual contract mappings, principal checks, JDBC queries; add the decision endpoint and one conditional update. `LeaveRequest` already has `decidedAt`; V2 already constrains terminal status/time, so no migration is needed.
- `backend/src/test/java/demo/leave/integration/request/LeaveRequestApiIntegrationTest.java` -- extend its single PostgreSQL 18.7 Testcontainer, Flyway, and test-only account setup for scoped reads, decisions, and concurrent transactions.
- `backend/src/test/java/demo/leave/request/{service,controller}/` -- add Docker-free unit/response tests; preserve current suites.
- `frontend/app/manager/page.tsx` currently renders the authenticated placeholder. Reuse its role, CSRF and sign-out flow while adding Manager UI in `frontend/components/leave/` and data/actions in `frontend/lib/leave/`.
- `frontend/app/api/leave-requests/`, `frontend/lib/api-proxy.ts` -- existing same-origin handlers forward cookie, CSRF, body, response status, and cookies; add nested decision POST route.
- `frontend/tests/unit/leave/` and `frontend/tests/e2e/` -- existing discovery includes these folders; add Manager cases without changing existing tests. UX requires assigned-only rows/cards, Pending-only actions, exact statuses, announcements, and status focus. Per the recorded decision, use the UX confirmation dialog.

## Tasks & Acceptance

**Execution:**
- [x] Update `backend/src/main/java/demo/leave/request/{controller/LeaveRequestController.java,service/LeaveRequestService.java,repository/LeaveRequestRepository.java}` with the decision mapping and transaction. One conditional `UPDATE` requires request ID, `PENDING`, and the authenticated Manager's assignment; classify a zero-row update with a scoped read as 404 or 409. Use the injected Clock and return UTC timestamps.
- [x] Extend `backend/src/test/java/demo/leave/integration/request/LeaveRequestApiIntegrationTest.java` for scoped details, unassigned test data, unauthenticated 401s, Employee 403, missing-request 404, decisions, and saved UTC instants. Race opposite decisions in concurrent PostgreSQL transactions; assert one success, one 409, and winner status/time. Add Docker-free tests in `backend/src/test/java/demo/leave/request/{service,controller}/`.
- [x] Replace the placeholder in `frontend/app/manager/page.tsx` with accessible loading, empty, error, assigned-list, dialog, saved-status, stale/failure, focus, and announcement behavior. An expired decision session returns the user to sign-in without implying success. Add Manager data/actions in `frontend/components/leave/` and `frontend/lib/leave/`; add the nested decision route under `frontend/app/api/leave-requests/` preserving cookie, CSRF, status, body, and content type, with generic 503 behavior when the backend is unreachable.
- [x] Add `frontend/tests/unit/leave/` coverage for list-load failures, actions, dialog Escape/focus restoration, duplicate-submit prevention, expired sessions, announcements, and proxy network/malformed-response behavior. Add `frontend/tests/e2e/` coverage that creates two fresh requests with run-unique markers as the assigned Employee, then signs in as Manager, approves/rejects separately, and verifies saved statuses. Assert exactly one row matches each run marker; markers distinguish these requests from older rows in the persistent database.
- [x] Audit `backend/src/test/java/`, `frontend/tests/unit/`, and `frontend/tests/e2e/` against Story 1.7; move only misplaced tests and preserve purpose, cases, assertions, and behavior.

**Acceptance Criteria:**
- Given a Manager lists or reads a request, when scope is evaluated, then only assigned Employees' data is returned and browser IDs cannot expand access.
- Given protected list, detail, or decision operations are called without a valid session, when authentication is checked, then the canonical contract's 401 response is returned without request data; an Employee attempting a Manager decision receives 403. An expired decision session returns the Manager to sign-in without announcing success.
- Given a decision or competing decisions are submitted, when PostgreSQL writes them concurrently, then one atomic assignment-plus-Pending update wins; stale or missing is 409 or 404 respectively, out-of-scope is non-disclosing 404, Employee is 403, and the saved status/time match the winner in UTC. The decision response contains the persisted ManagerLeaveRequest, including status and decidedAt; the UI uses the returned status.
- Given the Manager uses the dashboard and proxy, when lists, decisions, or errors occur, then list-load failures, confirmed decisions, stale conflicts, and other failures are announced accessibly; a stale decision whose refresh fails does not claim the status was refreshed or leave stale Pending controls visible; Cancel or Escape closes the dialog and restores focus to its invoking control; Confirm submits once and is disabled while pending; success closes the dialog and focuses the saved status; failure feedback does not imply success. The POST proxy preserves cookie, CSRF, status, body, and content type, and returns generic Problem Details 503 when the backend cannot be reached, without changing OpenAPI.
- Given all verification runs, when Maven, Jest, production build, and Playwright against rebuilt Compose services finish, then old and new tests pass and seeded accounts/persistent database remain intact. Maven Testcontainers requires Docker; unit tests do not.

## Implementation Notes

- Implemented the assignment-scoped Manager list/detail and atomic decision write. The single conditional JDBC update enforces request ID, Pending status, and authenticated Manager assignment together; decisions return the saved UTC `decidedAt` instant. The OpenAPI contract and seeded accounts were left unchanged.
- Added scoped-access, Employee-forbidden, approve/reject, stale/conflicting, persisted timestamp, and concurrent PostgreSQL Testcontainers coverage. Opposite decisions produce one winner and one 409; assertions check the stored winner status and timestamp. Test-only data covers unassigned Employees.
- Added the Manager dashboard and same-origin decision proxy, including cookie/CSRF and response forwarding, accessible states, confirmation dialog, focus movement, and failure/stale announcements. Jest covers the new UI and proxy behavior.
- Playwright creates two fresh Pending requests through the assigned Employee flow with run-unique markers, then approves and rejects them as Manager. It does not clear the persistent database or change seeded accounts.
- Verification passed: Maven `verify` (26 tests, including 8 PostgreSQL Testcontainers tests, run in a Java 25 container because the host has no Java runtime), Jest (29 tests), production build, Compose image rebuild and healthy startup, and full Playwright suite (3/3). Compose services were stopped afterward and the volume was retained. The Story 1.7 test-structure audit found no misplaced tests; existing assertions were preserved.
- No work was deferred. All ten prior Adversarial findings have documented dispositions, both Quick review findings are resolved, and the final Quick review of the updated delta returned no findings.
- Review-loop follow-up: the prior Adversarial findings were checked against the canonical contract, implementation, and tests. Findings A1, A4, and A5 are covered by the persisted ManagerLeaveRequest response, the single assignment-scoped conditional update, and the existing PostgreSQL ready/start latch race test. A6 is covered by PostgreSQL integration assertions for unassigned list, detail, and decision access; duplicating this with mutation of the persistent Compose database is unnecessary and conflicts with the assigned-account Playwright setup. A10 is covered by the run-unique marker and exact-one locator assertions. Findings A2, A3, A7, A8, and A9 were addressed with explicit acceptance criteria and additional authorization, missing-ID, proxy, dialog, pending-submit, expired-session, and list-error coverage.

## Plan Change Log

## Review Triage Log

- A1 — Covered; `LeaveRequestController.manager(...)` maps the persisted status and `decidedAt`, the decision service returns the saved row, `ManagerDashboard` renders `saved.status`, and the PostgreSQL/Jest tests check server-returned values. Displaying the decision timestamp in the UI is outside the UX requirement; the API still returns it per OpenAPI.
- A2 — Resolved; OpenAPI already defines 401 for absent/expired sessions and 403 for a non-Manager decision. Added acceptance criteria, PostgreSQL 401 checks for list/detail/decision, retained the Employee 403 integration assertion, and routed an expired decision session to sign-in with a Jest assertion.
- A3 — Resolved; service classification uses an assignment-scoped follow-up read, so missing/unassigned returns 404 and assigned non-Pending returns 409. Added an authenticated missing-ID decision assertion for the same generic non-disclosing 404; existing tests cover unassigned 404 and assigned stale 409.
- A4 — Covered; `LeaveRequestRepository.decide` checks request ID, `PENDING`, and the current `employee_manager_assignment` row in the same `UPDATE`. No separate authorization read precedes the write; existing concurrent decision test exercises the conditional update.
- A5 — Covered; `concurrentOppositeDecisionsHaveExactlyOneWinner` uses two worker transactions, `ready` and `start` CountDownLatches, and checks one 200, one 409, and persisted winner status/time.
- A6 — Covered at the API layer; the PostgreSQL integration test creates test-only unassigned Employee data and verifies list exclusion plus non-disclosing detail and decision 404s with no mutation. The Compose E2E remains focused on the required assigned Employee-to-Manager journey and does not mutate persistent accounts or assignment data.
- A7 — Resolved; the existing proxy forwards upstream status, body, and content type and maps network failure to generic 503 Problem Details. Added Jest cases for unreachable backend and malformed upstream body/status/content-type forwarding.
- A8 — Resolved; `closeDialog` restores focus to the triggering control, Escape uses that path, and `saving` disables the confirmation control. Added Jest assertions for Escape focus restoration and one submission while the first is pending.
- A9 — Resolved; list failures use `role=alert`, confirmed decisions use `role=status`, and stale/decision failures use alerts without success language. Added Jest coverage for list-load failure and stale-refresh failure; existing tests cover success, stale conflict, and decision failure.
- A10 — Covered; the E2E marker combines current time and random data and each request locator includes the full marker plus its decision suffix. Added exact-one count assertions before review actions; no cleanup or database reset is used.
- Quick review Q1 — Resolved; a 409 followed by a failed refresh previously announced a refresh that had not succeeded and left stale Pending controls visible. The UI now clears the stale list and announces that the saved status could not be refreshed; Jest covers the failed refresh path with multiple requests.
- Quick review Q2 — Resolved; after Q1, clearing only the conflicted row could leave other outdated Pending rows visible if the list refresh failed. The fallback now clears the full unrefreshed list, and the Jest regression test asserts both the conflicted and another Pending row disappear.

## Design Notes

The assignment predicate is part of the conditional write, not an earlier authorization query. A follow-up lookup is only for classifying a failed conditional update (assigned but no longer Pending = 409; missing or unassigned = 404). The existing Testcontainers suite truncates only its disposable database between cases; Playwright creates its own requests through the UI and never cleans persistent Compose data.

## Verification

**Commands:**
- `cd backend && ./mvnw -B verify` -- expected: unit and PostgreSQL 18.7 Testcontainers integration tests pass; Docker is available.
- `cd frontend && npm run test:unit` -- expected: all Jest tests pass, including Manager coverage.
- `cd frontend && npm run build` -- expected: production build passes.
- `docker compose build backend frontend` then `docker compose up -d --force-recreate --wait --wait-timeout 180` -- expected: rebuilt services are ready.
- `cd frontend && npm run test:e2e` -- expected: Manager journey passes against rebuilt containers after creating two unique requests through the Employee flow.
- `docker compose stop` -- run after Playwright, retaining the database volume.

**Manual checks:**
- Confirm existing test bodies and assertions are preserved and the canonical OpenAPI file is unchanged.
- Confirm no Testcontainers integration test uses the seeded Compose database, and no Playwright setup depends on existing rows.
