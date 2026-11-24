---
id: 7
type: story
title: "Refactor existing project structure"
parent: epic-employee-leave-first-build
covers: []
after: ["SCRUM-8"]
refined: true
hitl: false
risk: low
tracker_id: "SCRUM-9"
remote: "https://sriramkasthuriuk.atlassian.net/browse/SCRUM-9"
tracker_status: done
---

# Refactor existing project structure

## Description

Groups the existing Spring Boot and Next.js code and tests into a clear structure without changing behavior or API contracts.

## Requirements

Verify: From the repository root, run `cd backend && ./mvnw -B verify`, then `cd frontend && npm run test:unit && npm run build`. With the existing Compose stack started separately, run `cd frontend && npm run test:e2e`. Confirm Maven, Jest, and Playwright discover the existing test files in their proposed folders, the existing test cases/assertions are unchanged, and the canonical OpenAPI contract is unchanged.

1. **Group Spring Boot application code by responsibility**
   **Given** the backend source and existing JUnit tests are in the current flat Java package
   **When** the source is reorganized
   **Then** the application entry point remains at the `demo.leave` root
   **And** authentication classes, account persistence classes, security configuration, and readiness handling are placed in the corresponding proposed packages in Notes
   **And** existing Java test files are moved into matching authentication and security test packages
   **And** all package declarations and imports resolve after the moves
   **And** generated Java sources remain under `target` with their current package names

2. **Separate Next.js routes, shared auth code, and tests**
   **Given** the App Router pages, shared auth components, role-routing helper, and existing Jest and Playwright tests are in their current locations
   **When** the frontend is reorganized
   **Then** route entry points, the API route handler, layout, and global styles remain in the App Router tree
   **And** shared auth components and role-routing logic are placed in the proposed component and library folders in Notes
   **And** existing Jest and Playwright test files are moved into the proposed unit and end-to-end test folders in Notes
   **And** page imports, test imports, Jest discovery, and Playwright discovery resolve the moved files
   **And** Jest roots and test matching include the proposed unit-test folder, and Playwright `testDir` points to the proposed end-to-end test folder

3. **Preserve runtime behavior and existing verification**
   **Given** the backend and frontend files have moved
   **When** the existing verification commands run from the repository
   **Then** existing backend JUnit, frontend Jest, production build, and Playwright checks pass without adding or removing test cases or changing existing assertions
   **And** the OpenAPI contract, generated API package names, endpoint paths, request and response shapes, and status behavior remain unchanged
   **And** the sign-in routes, session and CSRF behavior, same-origin proxy behavior, and placeholder paths remain unchanged

## References

- parent — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/epic-employee-leave-first-build.md, Constraints and Done when
- predecessor — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/tickets/story-add-session-authentication-and-role-lookup.md, auth/session behavior and existing frontend placeholders
- next story — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/tickets/story-build-employee-leave-submission-and-dashboard.md, current shared routes and auth component integration

## Boundaries

- Must not change: runtime behavior, authentication and authorization rules, CSRF or session handling, route URLs, API operation paths, request or response shapes, status codes, or the canonical OpenAPI contract.
- Must not change: existing test cases or assertions. Move files and update package declarations, imports, and discovery configuration only; do not add features, dependencies, scripts, or test cases.
- Must not change: generated source packages, migrations, database schema, Docker build contexts, or container entry points.

## Notes

- Decision: 2026-11-15 — Use the following minimal structure, keep generated Java under `target`, and preserve the existing API contract and runtime behavior.

```text
backend/src/main/java/demo/leave/
  LeaveApplication.java
  auth/
    controller/  AuthController
    exception/   AuthExceptionHandler
    service/     AuthService, AppUserDetailsService
    security/    AppUserPrincipal
  user/
    model/       AppUser
    repository/  UserRepository
  config/security/
    SecurityConfiguration
  readiness/controller/
    ReadinessController
backend/src/test/java/demo/leave/
  auth/service/       AuthServiceTest
  config/security/    AnonymousProtectedPostTest, SecurityAuthenticationTest,
                      SecureSessionCookieTest

frontend/
  app/                   route pages, API route handler, layout, global styles
  components/auth/       AuthenticatedPlaceholder, SignInForm
  lib/auth/               role-routing helper
  tests/unit/auth/        existing Jest test files
  tests/e2e/              existing Playwright auth test
```

- Update `frontend/jest.config.cjs` so Jest discovers `tests/unit/auth/`, and update `frontend/playwright.config.ts` so Playwright discovers `tests/e2e/`.
- Generated Java remains under `backend/target/generated-sources/openapi`, in its existing generated packages.
- Decision: 2026-11-15 — Use the explicit responsibility packages above for handwritten backend code and matching test packages. Keep the application entry point at `demo.leave`; generated sources remain under `target` and retain their packages.
- Risk: low — incorrect paths are caught by existing builds and test suites before feature behavior changes.
