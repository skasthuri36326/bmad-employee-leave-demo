---
title: '1.7 Refactor existing project structure'
type: refactor
ticket: '7'
created: '2026-11-15'
status: done
baseline_revision: 'NO_VCS'
route: oneshot
route_source: auto
risk: low
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Existing Spring Boot classes and Next.js auth/tests are grouped flatly, making the project harder to navigate.

**Approach:** Move existing code and tests into the responsibility folders in Story 1.7. Update Java packages, imports, and frontend discovery configuration while preserving behavior and API contracts.

</frozen-after-approval>

## Implementation Notes

This was a mechanical, move-only refactor affecting more than five files; the oneshot route was appropriate because no feature logic or substantial code was added. Handwritten Java now uses the requested responsibility packages, and its existing tests use matching auth-service and config-security packages. Frontend auth components, role routing, Jest tests, and Playwright test now occupy the story's folders. Updated package declarations, imports, Jest roots/test matching, and Playwright `testDir`; test bodies and assertions are unchanged. Maven generation and Docker build contexts were not changed.

The host has no Java runtime, so `cd backend && ./mvnw -B verify` could not run directly. `docker compose build backend` ran that same `./mvnw -B verify` command in the JDK build image and completed with `BUILD SUCCESS`. The frontend Jest suite passed (3 suites, 10 tests), `npm run build` passed, and the rebuilt Compose stack became healthy before the Playwright test passed (1 test covering both roles). The canonical OpenAPI file and external credential file were not changed. Existing unrelated staged and untracked working-tree changes were left in place.

## Code Review

### 2026-11-15

**Code review complete.** 0 `decision-needed`, 0 `patch`, 5 `defer`, 6 rejected. There is no commit baseline, so reviewers inspected a file-list snapshot of the refactored source; the build plan records the verification results.

- [x] [Review][Defer] Authenticated `/api/me` lacks a direct `Cache-Control: no-store` test assertion [backend/src/test/java/demo/leave/config/security/SecurityAuthenticationTest.java] — deferred: pre-existing verification gap; implementation already sets no-store.
- [x] [Review][Defer] Failed CSRF refresh after logout leaves the placeholder visible until the user returns to sign-in [frontend/components/auth/AuthenticatedPlaceholder.tsx] — deferred: pre-existing behavior outside this structure-only refactor.
- [x] [Review][Defer] Logout cookie clearing uses the current path and SameSite values [backend/src/main/java/demo/leave/auth/controller/AuthController.java] — deferred: pre-existing configuration edge case; current settings match.
- [x] [Review][Defer] Secure session cookie test assumes the default cookie name [backend/src/test/java/demo/leave/config/security/SecureSessionCookieTest.java] — deferred: pre-existing test configurability issue; current test uses the default.
- [x] [Review][Defer] Async placeholder checks can redirect after unmount [frontend/components/auth/AuthenticatedPlaceholder.tsx] — deferred: pre-existing navigation edge case.

**Rejected**

- False: `SecureSessionCookieTest` has one `TestPropertySource` import, and Maven verification compiled it.
- False: the CSRF matcher concern requires a public mutating route that does not exist; current non-login operations require authentication.
- False: anonymous `/api/me` requests are handled by Spring Security before the controller's fallback branch.
- False: Story 1.7 requires preserving the existing logout test; the test verifies the old authenticated session receives 401.
- False: current sign-in exception handling resets pending state and permits retry; expanding test cases is outside this story.
- False: the schema restricts persisted roles to Employee and Manager.

## Verification

**Commands:**
- `cd backend && ./mvnw -B verify` -- expected: all existing backend tests pass and generated sources compile.
- `cd frontend && npm run test:unit && npm run build` -- expected: existing Jest tests pass and the production frontend builds.
- With the existing Compose stack started separately, `cd frontend && npm run test:e2e` -- expected: existing Playwright login, session, CSRF, role URL, and logout check passes for both seeded roles.

**Manual checks:**
- Confirm the canonical OpenAPI contract and all existing test assertions are unchanged.
- Confirm the staged Story 1.3 ticket and all unrelated pre-existing working tree changes remain untouched.
