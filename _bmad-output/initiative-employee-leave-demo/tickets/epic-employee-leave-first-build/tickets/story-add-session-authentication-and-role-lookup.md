---
id: 3
type: story
title: "Add session authentication and role lookup"
parent: epic-employee-leave-first-build
covers: [R1, R6]
after: [2]
refined: true
hitl: true
risk: high
---

# Add session authentication and role lookup

## Description

The developer creates ignored `frontend/.env.local` values matching the externally seeded Employee and Manager accounts for Playwright. Both accounts can then sign in through one accessible shared form, route to a minimal placeholder page selected by their server-returned role, and sign out using Spring Security sessions and CSRF protection. Dashboard features are delivered by Stories 4 and 5.

## Requirements

Verify: authored acceptance tests first, then implement and verify the shared sign-in UI, server-derived role, session and CSRF behavior, and logout through the same-origin proxy.

1. **Bootstrap CSRF and preserve the session through the proxy** (R1, R6)
   **Given** a person opens the shared sign-in screen without a session
   **When** the frontend requests `GET /api/auth/csrf` through the same-origin proxy
   **Then** the response provides `headerName: X-CSRF-TOKEN` and a non-empty token bound to a new pre-login session, with `Set-Cookie` returned through the proxy
   **And** the proxy forwards `Set-Cookie` to the browser unchanged, forwards the browser's `Cookie` on subsequent API calls, and forwards `X-CSRF-TOKEN` unchanged on POST requests
   **And** after successful login or logout the frontend fetches a fresh token from `GET /api/auth/csrf` through the proxy before its next POST
   **And** the session cookie is named `LEAVESESSION`, is `HttpOnly`, uses `SameSite=Lax`, omits `Secure` for local HTTP, and sets `Secure` for HTTPS

2. **Authenticate only the server-derived seeded identity and role** (R1, R6)
   **Given** the Employee or Manager submits valid seeded credentials with the CSRF token
   **When** the same-origin proxy forwards the login request to Spring Boot
   **Then** Spring Security verifies the stored BCrypt hash and returns the authenticated identity and role from the stored account
   **And** login rotates the session ID, invalidates the pre-login session ID, and sets the authenticated `LEAVESESSION` cookie with the documented cookie attributes
   **And** invalid credentials return generic `401` Problem Details that do not reveal whether the email or password was wrong
   **And** login without a valid CSRF token returns `403`; login does not require an already authenticated session

3. **Complete shared sign-in accessibly and route by role** (R1)
   **Given** a person uses the single shared sign-in screen
   **When** they enter credentials and submit by button or Enter
   **Then** the form has persistently labeled, accessible email and password fields and a clearly named submit action in logical keyboard order with visible focus
   **And** while the request is pending, repeat submission is prevented and a visible pending state is announced
   **And** on success, the app uses the server-returned role to route to `/employee` for an Employee or `/manager` for a Manager without a role selector
   **And** both paths resolve to a minimal placeholder page in this story; Playwright asserts the resulting URL only, and dashboard features are added in Stories 4 and 5
   **And** on invalid credentials, the form stays unauthenticated and displays and announces the generic message “Email or password is incorrect.”

4. **Enforce session and CSRF response rules and invalidate logout** (R1, R6)
   **Given** a request calls a protected endpoint or logs out
   **When** the request is sent through the proxy with its current browser cookie and, for POST, its CSRF token
   **Then** anonymous protected requests return `401`, including when a POST also lacks or has an invalid CSRF token
   **And** a valid session with a missing or invalid CSRF token on a POST returns `403`
   **And** authenticated `GET /api/me` returns the session identity and server-stored role, while a browser-supplied role or identity cannot alter them
   **And** valid logout invalidates the authenticated session, expires the cookie, and causes reuse of the prior cookie to receive `401` from `GET /api/me`

5. **Add tests before feature implementation** (R1, R6)
   **Given** implementation of this story is about to begin
   **When** its acceptance checks are added
   **Then** the checks are written and run before production feature code is implemented
   **And** backend unit tests use JUnit and Mockito for authentication logic and server-derived roles
   **And** Spring Security tests verify CSRF, session ID rotation and pre-login invalidation, `GET /api/me`, and logout behavior
   **And** frontend Jest unit tests use React Testing Library (`@testing-library/react`, `@testing-library/user-event`, and `@testing-library/jest-dom`) with `jest-environment-jsdom` to cover form states, pending submission, keyboard submission, accessible generic errors, and Employee/Manager role-based routing
   **And** one Playwright end-to-end check runs locally against the already-running Docker Compose stack and verifies real login, same-origin proxy cookie and CSRF flow, role-selected URL only, and logout for both seeded roles
   **And** before running Playwright, the developer creates ignored `frontend/.env.local` with `DEMO_EMPLOYEE_EMAIL`, `DEMO_EMPLOYEE_PASSWORD`, `DEMO_MANAGER_EMAIL`, and `DEMO_MANAGER_PASSWORD` values matching the accounts created by the external seed; Playwright explicitly loads this file, and credentials are absent from test source and logs
   **And** for each seeded role, Playwright captures the pre-login `LEAVESESSION` cookie, confirms successful login replaces it, and confirms the old pre-login cookie gets `401` from `GET /api/me`
   **And** Playwright confirms logout is submitted with the post-login CSRF token; after logout it fetches a new pre-login CSRF token and uses it on the next valid login POST, which succeeds
   **And** after logout, Playwright reuses the saved authenticated cookie and confirms it also gets `401` from `GET /api/me`
   **And** Maven declares `spring-boot-starter-test` for JUnit/Mockito, `spring-boot-starter-webmvc-test` for MVC/MockMvc tests, and Boot-managed `spring-boot-starter-security-test` for Spring Security tests
   **And** frontend dependencies include Jest, React Testing Library and its DOM test environment, and Playwright with `test:unit` and `test:e2e` scripts and an updated committed `package-lock.json`
   **And** Compose is started separately before `test:e2e` runs, and no CI pipeline is required

## References

- parent — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/epic-employee-leave-first-build.md, Requirements R1 and R6
- architecture — _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/ARCHITECTURE-SPINE.md, AD-1 through AD-3 and AD-5
- api contract — _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml, `GET /api/auth/csrf`, `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/me`
- experience — _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/EXPERIENCE.md, Foundation, Sign-in form, State Patterns, Interaction Primitives, and Accessibility Floor
- design — _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/DESIGN.md, Sign-in form and focus ring

## Boundaries

- Must not change: identity and role come from the authenticated server session; the client cannot choose or elevate a role.
- Must not change: this story does not add registration, password recovery, or an external identity provider.
- Must not change: this story tests only the login and logout authentication path; the broader Employee and Manager Playwright journeys remain in Story 6.

## Notes

- Risk: high — session or CSRF mistakes can expose every protected operation. Extra check: prove that login rotates the session identifier and the pre-login identifier cannot authenticate after login.
