---
title: 'Story 1 scope adjustment: frontend health and manual Compose checks'
type: chore
ticket: '1'
created: '2026-11-14'
status: done
baseline_revision: NO_VCS
route: oneshot
route_source: auto
risk: high
review: thorough
review_source: pinned
lenses_ran: [blind-hunter, edge-case-hunter, verification-gap, intent-alignment]
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The frontend Compose healthcheck currently couples Next.js health to backend readiness, and frontend integration tests encode that cross-service behavior. Refined Story 1 accepts manual Compose checks for readiness and outage behavior.

**Approach:** Make frontend health depend only on a successful local `GET /` response. Remove the frontend integration tests, their npm scripts, and the test-only runtime image copy; preserve the readiness page and backend security test. Run and record the required manual Compose checks, including backend and database outages and anonymous POST security behavior.

## Boundaries & Constraints

**Always:** Preserve page behavior (generic ready/unavailable), backend/database readiness and network boundaries, and `AnonymousProtectedPostTest`. Record actual manual results without changing Story 1's ticket status.

**Never:** Change other stories or application behavior, add cross-service frontend tests, expose backend/database ports, commit changes, or mark Story 1 done.

</frozen-after-approval>

## Tasks & Acceptance

**Execution:**
- [x] `compose.yaml` -- make the frontend healthcheck issue only local `GET /` and pass on any HTTP 2xx response -- align container health with refined Story 1.
- [x] `frontend/package.json`, `frontend/Dockerfile`, and `frontend/tests/` -- remove both frontend integration tests, their npm scripts, and the runtime test-file copy -- keep Story 1 cross-service checks manual.
- [x] Compose runtime -- check ready state, stop backend, stop PostgreSQL, restore services, and verify local root HTTP 2xx, frontend health, and generic page status at each state; check anonymous POST directly to backend and through the proxy returns 401 without protected data -- record actual outcomes in this adjustment plan and Story 1 plan's verification evidence.

**Acceptance Criteria:**
- Given the frontend responds to local `GET /` with HTTP 2xx, when Compose runs its frontend healthcheck, then it passes without requesting backend readiness.
- Given backend or PostgreSQL becomes unavailable after startup, when the page and Compose health are checked, then the page shows only the generic unavailable state, root `GET /` remains 2xx, and frontend health remains healthy.
- Given an anonymous valid leave-request POST without cookie or CSRF header, when sent directly to the backend and via the frontend proxy, then both return 401 without protected request data.
- Given the frontend image is built, when its runtime contents and package scripts are inspected, then frontend integration tests, related scripts, and test-only image setup are absent while backend security tests remain.

## Implementation Notes

- Recorded `baseline_revision: NO_VCS` because the Git repository has no commit or `HEAD`; preserved pre-change snapshots of the scoped files in `/private/tmp/story1-scope-baseline/` for review.
- Set `active_initiative` to `initiative-employee-leave-demo`, the only initiative containing the requested Story 1, because the BMad ticket workflow could not resolve the story until an initiative was active.
- Changed application source only as scoped: the frontend Compose healthcheck now probes local `GET /`, and the two frontend integration tests, their npm scripts, and runtime test-file copy were removed. The readiness page and backend security test remain unchanged. Recorded verification evidence in this adjustment plan and the Story 1 plan.
- No tests were run; verification used the Compose build/start command and the requested manual Compose checks.

## Verification

**Commands:**
- `docker compose config -q` -- passed.
- `docker compose up -d --build --wait --wait-timeout 120` -- passed; frontend and backend images built and PostgreSQL, backend, and frontend reported healthy.
- Inspected frontend container healthcheck -- confirmed it contains only `fetch('http://127.0.0.1:3000/')` and exits based on `response.ok`.
- Initial local `GET /` -- HTTP 200 and generic ready state.
- Anonymous POST directly to backend and through same-origin proxy -- both returned HTTP 401 with body status 401 and none of `id`, `employeeId`, `employeeName`, `startDate`, `endDate`, `createdAt`, `decidedAt`, or `reason`; the submitted reason was not echoed.
- Backend outage (`docker compose stop backend`) -- local `GET /` returned HTTP 200 with generic unavailable text and no diagnostics; frontend remained healthy after the next Compose health interval. Restarting backend restored the generic ready state.
- PostgreSQL outage (`docker compose stop postgres`) -- local `GET /` returned HTTP 200 with generic unavailable text and no diagnostics; frontend remained healthy after the 6-second health observation. Recovery with `docker compose up -d --wait --wait-timeout 120` returned all services healthy in about 5 seconds and restored the generic ready state.
- Inspected the runtime image and package scripts -- no `/app/tests`, `test:proxy`, or `test:readiness`; `backend/src/test/java/demo/leave/AnonymousProtectedPostTest.java` remains present.
- `docker compose ps` after recovery -- all three services healthy; only frontend has a published host port.

## Review Triage Log

- `false` — The active-initiative configuration change was required to resolve the explicitly requested Story 1 through the project's BMad ticket workflow; this repository contains only `initiative-employee-leave-demo`.
- `medium` — The first manual POST assertion omitted `createdAt` and `decidedAt`; added both fields to the check and reran direct-backend and proxy POSTs, which returned HTTP 401 with body status 401 and none of the protected fields.

## Code Review

### 2026-11-14

**Code review did not pass.** 1 decision-needed, 2 patched, 0 defer, 8 rejected. Blind Hunter, Verification Gap Reviewer, and Intent Alignment Auditor completed. Edge Case Hunter returned an empty result and is recorded as failed. Story 1 remains in review.

- [ ] [Review][Decision] Automated frontend outage regression coverage is absent [compose.yaml:49] — no automated test protects frontend health during backend or PostgreSQL outages. Options: keep the refined manual Story 1 checks and defer automated coverage to Story 6; add automated Story 1 outage tests, which would change code and scope. Recommended: keep the manual checks and Story 6 deferral because that matches the refined Story 1 and the instruction not to change code.
- [x] [Review][Patch] Remove the stale duplicate anonymous POST command [story-scaffold-the-local-application-stack-plan.md:139] — removed; the adjacent command with the full field and reason-echo assertions remains.
- [x] [Review][Patch] Record PostgreSQL recovery command and health observation [plan-1-story1-scope-adjustment.md:63; story-scaffold-the-local-application-stack-plan.md:164] — added the actual Compose recovery command, 6-second frontend-health observation, and approximately 5-second healthy recovery.

**Rejected**

- R3 (false): the plan acceptance criteria specify any HTTP 2xx response, and the healthcheck uses `response.ok`.
- R4 (false): the server-rendered root HTML was fetched and checked for the required generic page state; no browser-only behavior is required.
- R5 (false): the plan documents manual outage and anonymous POST checks, which the refined story accepts in place of Story 1 cross-service tests.
- R6 (false): Story 1 requires retaining the backend security test and manually checking the anonymous POST behavior; the test source remains present.
- R8 (false): the recovery record says all services were healthy, which includes frontend health.
- R9 (false): the manual root-page response check verifies the required server-rendered status output.
- R10 (false): the adjustment plan identifies the local active-initiative setup needed by the BMad ticket workflow.
- R12 (false): fetching and inspecting the server-rendered response covers the generic page content required by Story 1.

### 2026-11-14

**Code review complete.** 0 `decision-needed`, 0 `patch`, 0 `defer`, 3 rejected. Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, and Intent Alignment Auditor completed; the Edge Case Hunter was retried after an empty first result. The review passes against the refined Story 1 criteria. Manual Compose checks remain accepted for readiness, backend/database outages and recovery, and anonymous POST security; broader automated browser and cross-service checks remain deferred to Story 6. No implementation code or Story 1 criteria were changed.

**Rejected**

- R1 + R4 (false): The healthcheck redirect concern is not reachable in the current implementation; the root route returns the status page directly, and no root redirect is configured.
- R2 (false): Leaving the short-lived healthcheck response body unread does not demonstrate a persistent bad outcome or violate a Story 1 criterion.
- R3 (false): Logging the HTTP status on healthcheck failure is optional diagnostics, not an unmet approved criterion or incorrect health result.
