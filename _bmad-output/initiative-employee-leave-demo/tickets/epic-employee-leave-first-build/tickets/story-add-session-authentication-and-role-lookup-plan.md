---
title: '1.3 Session authentication and role lookup'
type: feature
ticket: '3'
created: '2026-11-15'
status: done
baseline_revision: 'NO_VCS'
route: full
route_source: auto
risk: high
review: thorough
review_source: auto
lenses_ran: [blind-hunter, edge-hunter, verification-gap, intent-auditor]
review_loop_iteration: 1
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app has no sign-in or server session. Both seeded roles need to authenticate securely, and the frontend must route by the server-returned role without trusting client role input.

**Approach:** Add Spring Security session authentication, CSRF bootstrap and lifecycle handling, plus same-origin sign-in and sign-out UI. Route to minimal `/employee` and `/manager` placeholder pages; later stories add dashboard features.

## Boundaries & Constraints

**Always:** Keep proxy traffic same-origin; preserve `LEAVESESSION` as HttpOnly, SameSite=Lax, Secure on HTTPS and non-Secure for local HTTP. Rotate the session at login, clear CSRF state at authentication changes, and return 401 for anonymous protected calls before considering CSRF; valid sessions with invalid CSRF receive 403. Derive identity and role from stored accounts.

**Never:** Add registration, password recovery, external identity providers, dashboard features, CI, or committed demo credentials. Do not expose credential values in test source or logs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid login | Seeded credentials and pre-login CSRF token | 200 identity/role; new session cookie replaces pre-login ID | Old ID receives 401 from `/api/me` |
| Invalid login | Incorrect email or password with valid CSRF | Generic 401 Problem Details | Do not identify the incorrect field |
| Login with bad CSRF | Anonymous login with missing or invalid token | 403 | Do not authenticate |
| Protected POST without session | Missing, expired, or invalid session; any CSRF header | 401 | No protected data |
| Protected POST with bad CSRF | Valid session and missing/invalid token | 403 | No mutation |
| Logout and next login | Authenticated session; then refreshed pre-login token | Logout clears session; fresh token succeeds on next login | Old authenticated cookie receives 401 |

</frozen-after-approval>

## Code Map

- `backend/src/main/java/demo/leave/SecurityConfiguration.java` -- currently stateless, CSRF-disabled scaffold with a generic 401 entry point; replace only auth policy while preserving `/internal/ready`.
- `backend/src/main/java/demo/leave/ReadinessController.java` and `backend/src/main/resources/db/migration/V1__create_demo_account_schema.sql` -- readiness is independent; migration defines `app_user` and roles. Reuse these; do not change schema or seed flow.
- `_bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml` -- authoritative API contract; generate API interfaces and request/response models from this file, without generating endpoint behavior.
- `backend/pom.xml` and `backend/src/test/java/demo/leave/AnonymousProtectedPostTest.java` -- Boot 4.1.2 already supplies JUnit/Mockito and MVC test support; add Boot security-test and pinned OpenAPI Generator plugin support, and preserve the anonymous 401 test.
- `backend/Dockerfile`, `compose.yaml`, and root `.dockerignore` -- backend build context is currently only `backend/`, so it cannot read the canonical OpenAPI contract. Use repository root as the backend build context and `backend/Dockerfile` as its Dockerfile; map the Maven project to `/workspace/backend` and the canonical contract to `/workspace/_bmad-output/.../contracts/openapi.yaml` so the POM's `${project.basedir}/../_bmad-output/.../openapi.yaml` resolves. Keep generated output under `backend/target` and out of source control.
- `frontend/app/page.tsx`, `frontend/app/layout.tsx`, `frontend/app/styles.css` -- root currently displays readiness only; replace root with sign-in and shared accessible form styling.
- `frontend/next.config.ts` -- existing `/api/:path*` rewrite is the same-origin proxy candidate; verify Cookie, Set-Cookie, and X-CSRF-TOKEN pass through, adding handlers only if required.
- `frontend/package.json` and `frontend/package-lock.json` -- only build/start scripts exist; add Jest, React Testing Library, jsdom, Playwright, and test scripts; Docker uses `npm ci`.
- `compose.yaml`, `compose.seed.yaml`, `seed.sh`, `.gitignore` -- Compose runs the three services; seed credentials live in a developer-owned external SQL file; `.env.local` is ignored. Never read or log credential values.

## Tasks & Acceptance

**Execution:**
- [x] `backend/pom.xml`, `frontend/package.json`, `frontend/package-lock.json` -- add test dependencies and scripts before feature code so acceptance checks can run first. Pin `org.openapitools:openapi-generator-maven-plugin` at `7.27.0`.
- [x] `backend/src/test/java/demo/leave/AuthServiceTest.java`, `backend/src/test/java/demo/leave/SecurityAuthenticationTest.java` -- add JUnit/Mockito auth tests and Spring Security tests for CSRF, session rotation, `/api/me`, logout, cookie attributes, 401-before-CSRF, and 403 for login or a valid session with bad CSRF; run to establish failing acceptance checks.
- [x] `frontend/app/__tests__/sign-in.test.tsx`, `frontend/app/__tests__/role-routes.test.tsx`, `frontend/e2e/auth.spec.ts`, `frontend/jest.config.cjs`, `frontend/playwright.config.ts` -- add Jest/RTL/jsdom form and role-route tests, then one Playwright proxy login/logout flow for both seeded roles.
- [x] `backend/pom.xml` -- configure `org.openapitools:openapi-generator-maven-plugin` `7.27.0` to generate API interfaces and request/response models from the canonical `contracts/openapi.yaml`. Use Spring `spring-boot` generator with `useSpringBoot4=true`, `useSpringBoot3=false`, `interfaceOnly=true`, `skipDefaultInterface=true`, `requestMappingMode=api_interface`, `useSpringController=false`, `useTags=true`, `annotationLibrary=none`, `documentationProvider=none`, and `useBeanValidation=false`. Generate APIs/models only; disable server/supporting files, tests, and docs. Use packages `demo.leave.generated.api` and `demo.leave.generated.model`, output `backend/target/generated-sources/openapi/src/main/java`, and configure that generated Java source folder for compilation. Bind generation to `generate-sources`; regenerate with `cd backend && ./mvnw -B clean generate-sources`. Run generation against the real contract and verify the emitted API/interface and model names and signatures before handwritten code references them; confirmed output includes `AuthenticationApi`, `LoginRequest`, `CsrfToken`, `CurrentUser`, `Role`, and `Problem`.
- [x] `backend/src/main/java/demo/leave/AuthController.java`, `backend/src/main/java/demo/leave/AuthService.java`, `backend/src/main/java/demo/leave/AppUserDetailsService.java`, `backend/src/main/java/demo/leave/UserRepository.java`, `backend/src/main/java/demo/leave/SecurityConfiguration.java`, `backend/src/main/resources/application.properties` -- handwritten controllers implement the generated API interfaces; authenticate stored BCrypt hashes, persist security context in rotated sessions, implement csrf/login/logout/me behavior, configure cookie attributes, and preserve readiness behavior. Use generated request/response models confirmed from the generated output rather than duplicate handwritten API DTOs.
- [x] `frontend/app/page.tsx`, `frontend/app/components/SignInForm.tsx`, `frontend/app/employee/page.tsx`, `frontend/app/manager/page.tsx`, `frontend/app/api/[...path]/route.ts`, `frontend/app/styles.css` -- implement labeled sign-in fields, pending and announced generic error states, server-role routing, minimal placeholder pages at `/employee` and `/manager`, sign-out, and fresh CSRF fetches after login/logout. Add explicit same-origin proxy handling for cookies and the CSRF header.
- [x] `compose.yaml`, `backend/Dockerfile`, `.dockerignore` -- give the backend build repository root context and point it to `backend/Dockerfile`. Set `/workspace/backend` as the Docker build working directory; copy `backend/mvnw`, `backend/pom.xml`, `backend/.mvn`, and `backend/src` there. Copy the canonical contract from `_bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml` to the matching `/workspace/_bmad-output/.../contracts/openapi.yaml` location, which makes `${project.basedir}/../_bmad-output/.../openapi.yaml` resolve from `/workspace/backend`. Exclude VCS data, caches, local env files, and unrelated build output from the context while retaining that contract. Keep generated files under `backend/target` and out of source control.
- [x] `frontend/e2e/auth.spec.ts` -- explicitly load ignored `frontend/.env.local`; require values to match the external seed. Do not create or commit credentials. Start Compose separately before the E2E run.

**Acceptance Criteria:**
- Given either seeded role signs in, when authentication succeeds, then the session ID rotates, role is server-derived, and the browser reaches the matching placeholder URL.
- Given invalid credentials, when login is submitted with CSRF, then the response is a generic 401 and the UI announces “Email or password is incorrect.”
- Given a session cookie is issued, when its attributes are inspected, then it is HttpOnly and SameSite=Lax, with Secure omitted for local HTTP and set for HTTPS.
- Given protected POSTs, when no valid session exists, then they return 401; with a valid session but invalid CSRF, they return 403.
- Given successful login or logout, when the next POST occurs, then the frontend has fetched a fresh CSRF token through the proxy first.
- Given the Playwright flow for both roles, when it logs in, logs out with the post-login token, and logs in again with the new post-logout token, then both logins succeed, stale session IDs return 401, and only the role URL is asserted.
- Given `contracts/openapi.yaml` changes, when `cd backend && ./mvnw -B clean generate-sources` runs, then generated interfaces/models are reproducible under `target/generated-sources/openapi` and compile with handwritten controller implementations.
- Given the root-context Dockerfile layout, when `docker compose build backend` runs from the repository root, then the backend image builds with the POM and Maven Wrapper under `/workspace/backend` and the canonical contract at `/workspace/_bmad-output/.../contracts/openapi.yaml`; generated files remain under `target` and are not tracked.

## Implementation Notes

Generated sources were inspected before handwritten code referenced them: generation emitted `AuthenticationApi` and the expected authentication schema models. Generated Java remains under ignored `backend/target/generated-sources/openapi`; no generated source was added to the repository. The explicit same-origin proxy forwards Cookie and X-CSRF-TOKEN and relays Set-Cookie. `SESSION_COOKIE_SECURE=false` is the local HTTP setting; set it to `true` in HTTPS environments.

Review fixes keep `/employee` and `/manager` behind `/api/me` role checks, add a retry path when CSRF bootstrap fails, run a dummy BCrypt match for unknown accounts, mark CSRF responses `Cache-Control: no-store`, and use only the explicit `SESSION_COOKIE_SECURE` setting when emitting cookie attributes. A separate Spring Boot test verifies Secure on the session and clearing cookies. The Playwright test removes event listeners after each role flow and records no traces.

The host Maven settings referenced an internal mirror whose hostname did not resolve in this shell. Maven verification used a temporary settings file under `/private/tmp` pointing to Maven Central; no repository Maven settings were changed. Playwright explicitly loaded ignored `frontend/.env.local` and passed against the running Compose services without printing credential values.

## Plan Change Log

## Review Triage Log

| Finding | Disposition | Evidence |
|---|---|---|
| Snapshot diff appeared to contain only the root package-lock record. | False positive caused by the review snapshot. | The repository lockfile contains the full dependency graph; Docker `npm ci` completed successfully. |
| Placeholder paths could render without a matching authenticated role. | Fixed. | `AuthenticatedPlaceholder` checks `/api/me`, redirects anonymous users to `/`, and sends a mismatched role to the server-derived route; its Jest cases pass. |
| CSRF bootstrap failure left sign-in unavailable. | Fixed. | The form exposes a retry action; Jest verifies the form states. |
| Unknown accounts skipped password hashing, creating a timing difference. | Fixed. | `AuthService` performs a dummy BCrypt match for unknown emails; backend unit tests pass. |
| CSRF responses could be cached. | Fixed. | CSRF responses include `Cache-Control: no-store`; Spring Security tests pass. |
| Forwarded protocol headers could influence the Secure cookie flag. | Fixed. | Cookie security is controlled by explicit `SESSION_COOKIE_SECURE`; local and configured-secure cookie behaviors are covered. |
| Secure cookies needed direct verification. | Fixed. | `SecureSessionCookieTest` checks Secure, HttpOnly, SameSite=Lax, session rotation, and clearing attributes; it passes in Maven and the backend image build. |
| Nullable response context could fail while setting the CSRF header. | Fixed. | Controller validates the response context before use; Maven compilation and tests pass. |
| Playwright event handlers accumulated across role runs. | Fixed. | The test unregisters its named handlers; the both-role Playwright run passes. |
| A JSON `null` login body could produce a 500. | Fixed. | Null/missing credentials return 400, covered by `SecurityAuthenticationTest`. |
| Explicit pre-login to post-login CSRF replacement was not asserted. | Fixed. | Backend test asserts the token changes and the old token is rejected; Playwright asserts the token changes and validates the refreshed post-logout token by using it for the next login. |

## Design Notes

Authentication is established in a controller, so explicitly apply session-fixation protection and save the SecurityContext in the new session; defaults that only run on the form-login filter are not sufficient. Ensure anonymous protected POSTs map to 401 while the public login endpoint still returns 403 for invalid CSRF.

Pin OpenAPI Generator Maven plugin `7.27.0`, a stable release dated 2026-11-02. Configure `generatorName=spring`, `library=spring-boot`, `inputSpec=${project.basedir}/../_bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml`, `output=${project.build.directory}/generated-sources/openapi`, `apiPackage=demo.leave.generated.api`, `modelPackage=demo.leave.generated.model`, `addCompileSourceRoot=true`, and `sourceFolder=src/main/java`. Set `useSpringBoot4=true`, `useSpringBoot3=false`, `interfaceOnly=true`, `skipDefaultInterface=true`, `requestMappingMode=api_interface`, `useSpringController=false`, `useTags=true`, `annotationLibrary=none`, `documentationProvider=none`, `useBeanValidation=false`, `generateApis=true`, `generateModels=true`, and disable supporting files, API/model tests, and API/model docs. This places Java under `backend/target/generated-sources/openapi/src/main/java`; Maven compiles that source folder, and `generate-sources` runs as part of the standard lifecycle. Generated output stays under `target` and out of source control. Regenerate with `cd backend && ./mvnw -B clean generate-sources`. During generation, verify actual API/interface and model names and signatures from the output before implementing handwritten interfaces; the OpenAPI schema names are `LoginRequest`, `CsrfToken`, `CurrentUser`, and `Problem`, but generated names must be confirmed. Handwritten controllers implement generated interfaces; authentication, CSRF, and all application behavior stay handwritten. For Docker, set the backend build context to repository root and the Dockerfile to `backend/Dockerfile`; place the Maven project and wrapper under `/workspace/backend`, and copy the canonical OpenAPI file to `/workspace/_bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml`. The POM's relative `inputSpec` then resolves to that file. Preserve it through root `.dockerignore`. Official basis: [7.27.0 release](https://github.com/OpenAPITools/openapi-generator/releases/tag/v7.27.0), [Spring generator options](https://openapi-generator.tech/docs/generators/spring/), and [Maven plugin configuration](https://github.com/OpenAPITools/openapi-generator/blob/master/modules/openapi-generator-maven-plugin/README.md).

## Verification

**Commands:**
- `cd backend && ./mvnw -B clean generate-sources` -- expected: pinned generator reads the canonical contract, emits only API interfaces and models under `target/generated-sources/openapi`, and adds them to compile sources.
- `cd backend && ./mvnw -s /private/tmp/maven-central-settings.xml -B verify` -- passed after review fixes: pinned OpenAPI generation compiled and all 9 backend tests passed, including HTTPS cookie attributes, authentication/CSRF/session behavior, and mocked authentication logic.
- `cd frontend && npm run test:unit` -- passed after review fixes: 3 Jest suites and 10 tests cover form states, accessibility, keyboard submission, role routing, and authenticated placeholders.
- `cd frontend && npm run build` -- passed after review fixes: Next.js production build and TypeScript checks completed.
- `docker-compose build --no-cache backend frontend` from the repository root -- passed: backend image built using the root context, POM and Maven Wrapper under `/workspace/backend`, and canonical contract at `/workspace/_bmad-output/.../contracts/openapi.yaml`; frontend production image built as well.
- `docker-compose up -d --force-recreate --wait --wait-timeout 180` -- passed: PostgreSQL, backend, and frontend became healthy before the E2E run.
- `cd frontend && npm run test:e2e` -- passed after review fixes: the single Playwright test verified both seeded roles, session replacement, stale-cookie 401s, the role URL, logout with the post-login token, and a successful next login using the refreshed post-logout token.

**Manual checks:**
- Confirmed `frontend/.env.local` is ignored and contains all four required variable names; the Playwright check passed against the existing external seed without printing credential values. The browser check asserted only `/employee` and `/manager` URLs, not dashboard content.

## Code Review

### 2026-11-15

**Code review complete.** 0 `decision-needed`, 4 `patch`, 1 `defer`, 8 rejected.

- [x] [Review][Patch] Account lookup is ambiguous when stored emails differ only by case [backend/src/main/java/demo/leave/UserRepository.java:26]
- [x] [Review][Patch] Successful login followed by CSRF refresh failure prevents role navigation [frontend/app/components/SignInForm.tsx:61]
- [x] [Review][Patch] The dummy password comparison has no regression assertion [backend/src/test/java/demo/leave/AuthServiceTest.java:58]
- [x] [Review][Patch] Logout cookie clearing should use the configured session-cookie name [backend/src/main/java/demo/leave/AuthController.java:100]
- [x] [Review][Defer] Test-first execution order is not established by the available snapshot [Story 3 test-first requirement] — deferred: test chronology cannot be established without repository history; a contemporaneous red-phase test log or commit history would settle it.

**Patch follow-up:** Ambiguous case-insensitive matches now fail through the generic authentication failure path. Sign-in routes from the server role without waiting on a second CSRF request; the destination verifies `/api/me` and fetches CSRF before logout. The unknown-email unit test verifies the dummy hash comparison, and logout reads the configured session cookie name. Maven `verify` passed with 10 backend tests; Jest passed with 10 tests; Next.js production build passed; both-role Playwright passed against the rebuilt healthy Compose stack.

**Rejected**

- False: the review snapshot contains the selected file contents; it does not omit file bodies.
- False: failed login throws before session rotation or security-context persistence, leaving the pre-login session anonymous.
- False: anonymous non-login POSTs are currently protected by authentication; the only permitted state-changing login route explicitly requires CSRF.
- False: Problem Details strings use fixed internal titles and integer statuses, so user input cannot corrupt the JSON.
- False: the placeholder currently exposes no role-protected server data or metadata before client verification.
- False: successful logout navigates to the sign-in page, whose mount fetches a fresh CSRF token before its next POST.
- False: current API endpoints do not issue redirects, so relaying `Location` cannot expose a backend redirect today.
- False: the catch-all currently forwards only GET/POST and does not bypass backend authentication; unknown routes do not expose protected operations.
