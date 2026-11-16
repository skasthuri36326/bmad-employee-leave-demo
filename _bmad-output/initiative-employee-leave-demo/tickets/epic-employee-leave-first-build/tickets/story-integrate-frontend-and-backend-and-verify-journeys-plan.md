---
title: '1.6 Integrate frontend and backend and verify journeys'
type: feature
ticket: '6'
created: '2026-11-16'
status: done
baseline_revision: 'badb736db4f182d9e6e87f4c7d6fc320142d9a50'
route: full
route_source: auto
risk: high
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context:
  - _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml
  - _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/DESIGN.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The separate Employee and Manager features need repeatable local end-to-end proof across the browser proxy, Spring Boot, and PostgreSQL. Without isolated fixtures, direct authorization checks, and cleanup, a walkthrough can miss integration failures or disturb demo data.

**Approach:** Add a local Playwright runner container, run-scoped SQL fixture setup and cleanup, and browser/API journeys against the separately started Compose application stack.

## Boundaries & Constraints

**Always:** Apply Flyway migrations before backend health; use a unique run marker, per-run ID manifest, tracked SQL setup/cleanup files, transaction-safe fixture insertion, and failure cleanup that preserves seed data. Run every authorization case through both the same-origin proxy and directly to the backend from an E2E container on the application network. Include valid session and CSRF tokens on authenticated POSTs expected to reach role, assignment, or state authorization. Use the existing 390 × 844 phone viewport and verify keyboard behavior at desktop and phone sizes.

**Never:** Have the helper start or stop application services, publish backend/database ports, change demo seed rows, clear the database or volume, commit demo credentials, or duplicate unit/feature tests owned by Stories 3–5.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fixture setup | Run marker and migrated database | Insert second Employee, second Manager, their assignment, and a request in one transaction; second Employee belongs to second Manager, not seeded Manager | `psql` stops on SQL errors and rolls back |
| Fixture cleanup | E2E success, failure, or partial setup | Remove only rows identified by manifest IDs or run marker, child rows first | Exit trap attempts cleanup; never truncate or remove seed data |
| Authorization | Anonymous or authenticated role/assignment cases | Exact OpenAPI 401, 403, or 404 via proxy and direct backend | Authenticated POST checks use valid session and CSRF |

</frozen-after-approval>

## Code Map

- `compose.yaml` -- current frontend and backend share `app`; only frontend publishes port 3000. Keep this application stack unchanged and attach the E2E runner to `app`.
- `frontend/Dockerfile` -- production-only Next image does not contain Playwright browsers; add a separate E2E image based on a browser-ready Playwright image matching the lockfile.
- `frontend/package.json` and `frontend/playwright.config.ts` -- reuse `test:e2e`; config currently loads `.env.local` and targets loopback. Make base URL and mounted credential/manifest paths usable inside the runner.
- `frontend/tests/e2e/manager-decisions.spec.ts` -- already creates two marked requests and checks 390 × 844 decision UI and focused status; extend for repeat decisions, logout/account switching, persistence, and desktop/phone keyboard checks.
- `frontend/tests/e2e/auth.spec.ts` and `employee-leave.spec.ts` -- preserve existing login, CSRF rotation, validation, and submission assertions while loading seeded credentials from the runtime mount.
- `backend/src/main/resources/db/migration/V1__create_demo_account_schema.sql` and `V2__create_leave_request_schema.sql` -- authoritative user, role, assignment, and leave columns/constraints; fixture SQL must satisfy composite role FKs and BCrypt-shaped hashes.
- `backend/src/main/java/demo/leave/config/security/SecurityConfiguration.java`, `auth/controller/AuthController.java`, and `request/{controller,service,repository}` -- reuse public CSRF bootstrap, session login, auth-before-CSRF behavior, and atomic assigned-Pending decision; 404 hides unassigned requests and 409 identifies decided requests.
- `frontend/lib/api-proxy.ts` -- forwards cookie, CSRF header, request body, status, and response; use frontend service origin for proxy checks and backend service DNS for direct checks.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/Dockerfile.e2e` and `compose.e2e.yaml` -- define a separate one-shot Playwright service on the existing application network; do not alter application startup or port publishing.
- [x] `scripts/e2e/fixtures.sql` and `scripts/e2e/cleanup.sql` -- create and remove marker-scoped fixture accounts, assignment, and request in FK-safe order; setup is transactional.
- [x] `scripts/run-local-e2e.sh` -- require healthy existing services, create marker/manifest directory, register cleanup before setup, invoke both SQL files through container `psql` with configured database/user, marker, and `ON_ERROR_STOP=1`, capture IDs after commit, mount runtime credentials and manifest read-only, run/remove only E2E service, and clean on exit.
- [x] `frontend/playwright.config.ts` -- load the mounted ignored credentials and manifest without logging values; target `http://frontend:3000` in Compose.
- [x] `frontend/tests/e2e/manager-decisions.spec.ts` -- verify separate approval/rejection, repeat 409 with valid Manager session/CSRF, logout then Employee sees persisted results, and keyboard behavior at desktop and 390 × 844.
- [x] `frontend/tests/e2e/authorization.spec.ts` -- exercise each anonymous, wrong-role, cross-owner, and unassigned-manager case through proxy and direct backend; use valid sessions and CSRF on authenticated POSTs expected to return 403/404; assert no protected fields.

**Acceptance Criteria:**
- Given the application Compose stack is already healthy, when the local helper runs, then Flyway has completed, only the one-shot E2E runner is started/removed, and backend/database ports remain unpublished.
- Given fixture setup or E2E execution fails, when the helper exits, then cleanup uses captured IDs or the unique marker, removes only this run's rows, and preserves demo users, assignment, and volume.
- Given the seeded Employee submits a marked request and the seeded Manager decides two separate Pending requests, when the Manager logs out and the Employee signs in, then saved Approved and Rejected statuses remain visible without rejection reasons.
- Given each authorization scenario, when exercised through proxy and direct backend, then statuses match OpenAPI: anonymous 401, wrong role 403, cross-owner/unassigned 404, and repeat decision 409; protected POST checks use valid session and CSRF.
- Given keyboard-only browser journeys, when run at desktop and 390 × 844, then focus is visible and logical, validation is associated and focused, decision focus lands on the updated Status, and phone cards/actions work without horizontal scrolling.
- Given existing Stories 3–5 tests, when this E2E suite passes, then it adds integrated journey, persistence, network, and authorization evidence without duplicating their unit/feature cases.

## Implementation Notes

The E2E image uses Playwright 1.65.1, matching the version resolved in `package-lock.json`. The local run used `E2E_CREDENTIALS_FILE="$PWD/frontend/.env.local"` because the optional external credentials file was not present; credentials were mounted read-only and were not logged. The full local run passed four Playwright tests and cleanup deleted six run-scoped requests, one assignment, and two fixture accounts. Two earlier E2E attempts failed in browser checks and still ran cleanup successfully. The review finding about keyboard navigation was fixed by tabbing to the dialog confirmation control; the post-fix full run passed.

## Plan Change Log

## Review Triage Log

| Finding | Verdict | Route and evidence |
|---------|---------|--------------------|
| `manager-decisions.spec.ts` used programmatic focus on Confirm, bypassing dialog keyboard traversal | medium | patch — replaced `confirm.focus()` with `tabTo(page, confirm)` and an explicit focused assertion; post-fix Playwright journey passed at desktop and phone sizes. |

## Design Notes

Use the same Compose project and the existing `app` network so the one-shot runner resolves `frontend` and `backend` by service name. Keep fixture IDs in a per-run manifest mounted read-only. If ID capture fails after commit, cleanup queries by the unique marker. Use `psql -v ON_ERROR_STOP=1` and a single transaction for setup; cleanup deletes leave requests, assignments, then users. The direct API client obtains a CSRF token and session from the backend independently of the proxy client, so authorization assertions cannot pass on CSRF rejection. The E2E runner reads demo credentials from the external runtime-mounted file, never the image.

## Verification

**Commands:**
- `E2E_CREDENTIALS_FILE="$PWD/frontend/.env.local" ./scripts/run-local-e2e.sh` after separately running `docker compose up -d --wait --wait-timeout 180` -- passed: SQL setup completed after backend health, all four Playwright tests passed, and fixture cleanup committed.
- After the review fixes, `E2E_CREDENTIALS_FILE="$PWD/frontend/.env.local" ./scripts/run-local-e2e.sh` passed: all four Playwright tests passed and cleanup committed six requests, one assignment, and two fixture accounts.
- `E2E_CREDENTIALS_FILE="$PWD/frontend/.env.local" ./scripts/e2e/verify-cleanup-on-failure.sh` -- passed: injected marker-generation, transactional fixture-setup, runner, post-commit manifest, and invalid-manifest failures removed temporary/run-scoped data; seeded accounts and their assignment remained.
- `git diff --check` -- expected: no whitespace errors.

**Manual checks:**
- Confirmed only frontend is published, E2E joins the application network, credential/manifest mounts are read-only, and helper contains no application `up`, `stop`, or `down` operation.
- Confirmed cleanup selectors use literal run-marker matching wherever the marker occurs in a request reason and marker-scoped fixture account emails; they do not trust manifest IDs to target arbitrary rows. Demo seed rows and the named volume remain intact.
- Confirmed the OpenAPI contract and Stories 3–5 tests remain unchanged; repeat-decision 409 agrees with the contract.

## Code Review

### 2026-11-16

**Code review complete.** 0 `decision-needed`, 5 `patch` (fixed), 0 `defer`, 7 rejected. The Edge Case Hunter returned an empty result and was treated as a failed lens; the other three lenses completed.

- [x] [Review][Patch] Verify saved date values after the Employee returns from the Manager journey [frontend/tests/e2e/manager-decisions.spec.ts:170]
- [x] [Review][Patch] Assert the invalid field describes its validation error [frontend/tests/e2e/manager-decisions.spec.ts:71]
- [x] [Review][Patch] Assert no Manager request appears while the Employee request list is loading [frontend/tests/e2e/manager-decisions.spec.ts:164]
- [x] [Review][Patch] Validate OpenAPI Problem Details shape and recursively reject protected fields [frontend/tests/e2e/authorization.spec.ts:19]
- [x] [Review][Patch] Exercise cleanup after runner and manifest failures and verify seed preservation [scripts/e2e/verify-cleanup-on-failure.sh:1]

Rejected:
- `low` — The `tabTo` helper sends real Tab key presses in the intended field and action sequence; no concrete user-visible misordering was demonstrated, and asserting every browser-native date-input stop would add brittle test complexity.
- `false` — `role="status"` has implicit polite live semantics, and the test verifies that this region receives the final message.
- `false` — The fixture Manager is checked by `managerId`, the request owner by `employeeId`, and the request by `requestId`; fixture Employee authentication is not required.
- `false` — The generated UUID marker is private to the run directory and unknown to existing rows; marker matching is the specified fallback.
- `false` — The seeded Employee session reads the run-scoped request owned by the fixture Employee, so this is a cross-owner GET.
- `false` — The browser decision requests and the authorization fixture serve distinct explicit requirements; the plan does not require the same records for both.
- `false` — The Manager journey test also signs in the Employee, creates requests, and verifies persisted results at both viewport sizes using keyboard interaction.

### 2026-11-16 — Edge Case Hunter follow-up

**Follow-up review complete.** 0 `decision-needed`, 1 `patch` (fixed), 0 `defer`, 0 rejected. The Edge Case Hunter completed on follow-up and identified that a temporary run directory could remain if marker creation failed before the normal cleanup trap was installed. The Verification Gap Reviewer found no gaps. The Intent Alignment Auditor confirmed alignment. The Blind Hunter timed out and remains a failed lens.

- [x] [Review][Patch] Install an immediate EXIT cleanup trap after creating the temporary run directory, and verify marker-generation failure cleanup [scripts/run-local-e2e.sh:21].
- Confirmed the five prior review fixes remain present: saved request dates after returning as Employee, validation error association for the invalid date field, no Manager request content while the Employee list is blocked, exact Problem Details/authorization assertions, and cleanup coverage that preserves seed rows.
- The focused cleanup check passed for marker-generation, runner, and post-commit manifest failures. The previously passing four-test Playwright E2E run remains the verification for the journey fixes; it was not rerun because this follow-up changed only the pre-fixture temporary-directory cleanup path.

### 2026-11-16 — E2E SQL cleanup correction

Tightened cleanup after tracing the reported root cause: SQL no longer treats manifest IDs as standalone delete authority or uses wildcard substring matching. It deletes only requests explicitly marked with this run's literal marker and rows owned by the marker-scoped fixture accounts. If the manifest is malformed, the helper skips ID extraction and still cleans by marker. The full four-test E2E run and failure-injection cleanup checks passed after this change; seeded accounts and assignment remained intact.

### 2026-11-16 — Full code review follow-up

**Code review complete.** 0 `decision-needed`, 10 `patch` (fixed), 0 `defer`, 0 rejected. The Edge Case Hunter completed and found that browser-created request reasons place the run marker after a prefix, so prefix-only cleanup left requests behind. The Blind Hunter completed with nine improvement findings. The Verification Gap Reviewer found no gaps; the Intent Alignment Auditor confirmed the harness-focused reading of Story 6.

- [x] [Review][Patch] Match the run marker anywhere in request reasons; verify marked requests are removed [scripts/e2e/cleanup.sql:5].
- [x] [Review][Patch] Assert the seeded Manager's list omits the unassigned fixture request [frontend/tests/e2e/authorization.spec.ts:87].
- [x] [Review][Patch] Verify `/api/me` reports the expected role before authorization assertions [frontend/tests/e2e/authorization.spec.ts:7].
- [x] [Review][Patch] Replace Bash 4-only `mapfile` in the local cleanup verifier [scripts/e2e/verify-cleanup-on-failure.sh:100].
- [x] [Review][Patch] Verify blank-reason feedback and that it creates no request [frontend/tests/e2e/employee-leave.spec.ts:22].
- [x] [Review][Patch] Assert visible focus outlines as keyboard navigation reaches controls [frontend/tests/e2e/manager-decisions.spec.ts:31].
- [x] [Review][Patch] Verify the fixture Employee can read their own request [frontend/tests/e2e/authorization.spec.ts:93].
- [x] [Review][Patch] Assert Manager decision controls are visible at phone width [frontend/tests/e2e/manager-decisions.spec.ts:111].
- [x] [Review][Patch] Align Story 6 cleanup wording with marker-only cleanup [Story 6 ticket, Requirements 2].
- [x] [Review][Patch] Document the `E2E_CREDENTIALS_FILE` override [Story 6 ticket, Requirements 7].
- Confirmed the five previously recorded fixes remain present: saved dates after the Employee returns, validation error association, no Manager content during Employee list loading, Problem Details shape/protected-field checks, and failure cleanup preserving seed data.
- A read-only query found five leftover requests from an earlier run under one E2E marker. The corrected cleanup SQL removed those five; the follow-up check returned `0|0|0|2|1` (no marked requests/accounts/assignments; two seeded accounts and their assignment remain).
- A final read-only database check found zero remaining E2E-marked requests.

Rejected: none.

### 2026-11-16 — Review after Story 6 wording update

**Code review complete.** 0 `decision-needed`, 4 `patch` (fixed), 0 `defer`, 6 rejected. The Blind Hunter completed with nine findings. The Verification Gap Reviewer found no gaps, and the Intent Alignment Auditor found the updated ticket wording aligned with the cleanup and credential handling. A structured Edge Case Hunter recheck completed and returned one candidate finding, which was verified as false. The earlier empty lens result is superseded. This was not an E2E test failure; the latest Playwright run passed all four tests.

- [x] [Review][Patch] Inject a mid-transaction fixture setup error and verify rollback plus marker cleanup [scripts/e2e/verify-cleanup-on-failure.sh:49].
- [x] [Review][Patch] Assert the Employee sees no rejection-reason content [frontend/tests/e2e/manager-decisions.spec.ts:183].
- [x] [Review][Patch] Exercise a near-limit request reason at phone width while checking visibility and overflow [frontend/tests/e2e/manager-decisions.spec.ts:84].
- [x] [Review][Patch] Include employee email in the denied-response protected-field checks [frontend/tests/e2e/authorization.spec.ts:27].

Rejected (not pending test failures):
- `low` — Cleanup-failure itself is a rare recovery path; the helper reports and preserves the marker/manifest for manual recovery, while simulating a database cleanup failure would add substantial test-harness complexity.
- `false` — The invalid field receives focus and its `aria-describedby` points to the visible validation error.
- `false` — After each decision, the test asserts focus on the updated Status and its visible outline.
- `false` — The authentication journey reuses the saved authenticated cookie after logout and asserts `/api/me` returns 401.
- `false` — The alternate Employee fixture is used for API ownership authorization; the ticket's browser journey is for the seeded Employee, and the fixture owner detail GET succeeds through both API paths.
- `false` — UUID generation failure exits before the SQL cleanup trap is registered; only the early temporary-directory trap runs. The marker-failure injection confirms that no database cleanup receives an empty marker.
