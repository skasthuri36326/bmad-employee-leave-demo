---
id: 1
type: story
title: "Scaffold the local application stack"
parent: epic-employee-leave-first-build
covers: [R7, R6]
after: []
refined: true
hitl: false
risk: high
---

# Scaffold the local application stack

## Description

The Next.js frontend, Spring Boot API, Maven Wrapper, and PostgreSQL start through Compose. The page shows only a generic ready or unavailable state based on backend/database readiness, while the frontend Compose healthcheck passes when the local Next.js endpoint returns HTTP 2xx, regardless of backend/database availability.

## Requirements

1. **Use the architecture's specified service version lines** (R7)
   **Given** the project scaffold is created
   **When** service manifests, wrapper properties, and Compose images are configured
   **Then** exact versions specified by the architecture are used: Next.js 16.4.6 with the App Router, Spring Boot 4.1.2, and PostgreSQL 18.7
   **And** version lines without an architecture-specified patch remain Node.js 26 LTS, TypeScript 5.x, Java 25, Maven Wrapper on Maven 3.9.x, and Docker Compose v2; no additional patch or image digest is required by this story
   **And** the Docker build runs the checked-in Maven Wrapper in a Java build container to package the backend JAR, then copies that JAR into the Java runtime image
   **And** building the backend image requires no host Java or Maven installation

2. **Provide PostgreSQL runtime credentials without tracking secrets** (R7)
   **Given** the local Compose stack needs to connect Spring Boot to PostgreSQL
   **When** a developer configures a local run
   **Then** Compose obtains `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` from a developer-created, ignored root `.env` file and fails clearly when any required value is missing or empty
   **And** tracked `.env.example` lists those variable names with safe placeholders only
   **And** these PostgreSQL runtime values are distinct from Employee and Manager demo credentials; Story 2 provisions demo credentials from its separate local source outside the repository

3. **Start the local services with internal health probes** (R7)
   **Given** the local runtime is available
   **When** the developer starts Docker Compose
   **Then** PostgreSQL health uses `pg_isready`, backend readiness requires the database connection, and Compose starts the backend only after PostgreSQL is healthy and the frontend only after the backend is healthy
   **And** the frontend Compose healthcheck passes when the local Next.js endpoint returns HTTP 2xx, regardless of backend/database availability; it does not evaluate backend/database readiness or the page's displayed status
   **And** health probes and backend/database ports remain internal to Compose
   **And** the browser page receives only a generic ready or unavailable state, never probe output, database details, or backend diagnostics

4. **Trace the service path** (R7)
   **Given** the browser loads the local application
   **When** Next.js checks the backend's internal readiness, which confirms PostgreSQL readiness
   **Then** the page shows a generic ready state when the dependency check succeeds and a generic unavailable state when a backend or database dependency is unavailable
   **And** backend, database, and readiness probes are not exposed as browser data APIs or diagnostic endpoints

5. **Keep protected APIs default-deny until authentication is implemented** (R6)
   **Given** no session cookie is present and no CSRF header is sent
   **When** a caller sends `POST /api/leave-requests` with a valid request body directly to Spring Boot on the internal Compose network and through the same-origin Next.js proxy
   **Then** both responses are 401 and contain no protected request data
   **And** the anonymous POST does not need a CSRF token to receive 401
   **And** the OpenAPI contract specifies that a POST with a valid session but a missing or invalid CSRF header returns 403; Story 3 verifies this authenticated case at runtime
   **And** no frontend route or hidden control is treated as an authorization check
   **And** this scaffold does not implement login, logout, sessions, CSRF token issuance/validation, or role lookup; Story 3 adds those operations and authenticated POSTs require CSRF protection per the API contract

6. **Separate tracked examples from local environment files** (R7)
   **Given** the repository is prepared for local startup
   **When** a developer inspects environment configuration and source-control rules
   **Then** tracked `.env.example` contains variable names and safe placeholders only, including the PostgreSQL runtime variables
   **And** `.env.local`, `.env`, and `.env.*.local` files are ignored and are never committed
   **And** demo credentials still come from a separate local file outside the repository, as required by the PRD

7. **Keep readiness verification within the scaffold scope** (R7)
   **Given** the developer has started the local Compose stack
  **When** the developer uses Docker Compose command-line checks to start services, inspect service health, and manually check the browser page with backend and database dependencies available and unavailable
  **Then** the page shows only the generic ready or unavailable state and no diagnostic details
  **And** `GET /` on the local Next.js endpoint returns HTTP 2xx while Next.js responds, independent of backend/database availability
  **And** Requirement 5's direct-backend and same-origin-proxy anonymous POST security behaviors remain required and are verified manually with Docker Compose CLI; both return 401 without protected request data when no session cookie or CSRF header is sent
  **And** these manual checks are accepted verification for Story 1 and do not require automated cross-service tests; automated browser and cross-service Playwright coverage belongs to Story 6, “Integrate frontend and backend and verify journeys”

## References

- parent — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/epic-employee-leave-first-build.md
- architecture — _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/ARCHITECTURE-SPINE.md, Stack Seed and Deployment & Operations Envelope
- api contract — _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml, protected operation responses
- experience — _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/EXPERIENCE.md, Foundation

## Boundaries

- Must not change: the browser calls the same-origin Next.js proxy; backend and database ports remain internal to Compose.
- Must not change: the stack starts without seed users, login/session implementation, registration, Admin functionality, or leave-request behavior before their owning stories.
- Must not change: the frontend Compose healthcheck passes when the local Next.js endpoint returns HTTP 2xx, regardless of backend/database availability; it is not a backend/database readiness signal or a check of the page's displayed state.
- Must not change: manual Docker Compose command-line checks are accepted for ready/unavailable behavior; automated browser and cross-service tests are not required in Story 1, and broader Playwright coverage belongs to Story 6. Requirement 5's backend security checks remain required.

## Notes

- Decision: 2026-11-13 — Keep health probes internal and return only generic browser readiness; protected anonymous API calls return 401; Story 3 owns login/session/CSRF/role lookup; track `.env.example`, ignore local env files, and keep demo credentials outside the repository.
- Decision: 2026-11-13 — User approved Story 1 acceptance criteria only; other initiative, epic, and story criteria remain unapproved.
- Decision: 2026-11-14 — PostgreSQL runtime values (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`) come from an ignored local `.env`; they are separate from demo account credentials provisioned by Story 2.
- Decision: 2026-11-14 — Follow the architecture's version labels exactly: retain only its specified exact versions and do not add patch pins where it specifies a family or major line.
- Decision: 2026-11-14 — Verify anonymous `POST /api/leave-requests` directly on the internal Compose network and through the same-origin proxy; with no cookie or CSRF header, both return 401 without protected data.
- Decision: 2026-11-14 — Match the OpenAPI authentication-before-CSRF order: anonymous POSTs return 401 before CSRF evaluation; authenticated POSTs with missing or invalid CSRF headers return 403, with runtime verification in Story 3.
- Decision: 2026-11-14 — The page shows generic unavailable during a backend or database dependency outage, while the frontend Compose healthcheck reports only whether Next.js responds. Manual Compose checks are accepted for Story 1; broader automated Playwright integration coverage is deferred to Story 6.
- Risk: high — service exposure or security defaults set incorrectly could affect every later story. Extra check: inspect the Compose network and published port bindings to confirm only the frontend is reachable from the host.
- HITL: false is appropriate because no person-specific setup or judgment is part of this story; running Compose and its checks is implementation verification. High risk is handled by the extra network/port review above, not by adding a manual build step.
