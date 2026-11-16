---
id: 6
type: story
title: "Integrate frontend and backend and verify journeys"
parent: epic-employee-leave-first-build
covers: [R1, R2, R3, R4, R5, R6, R7]
after: [5]
refined: true
hitl: false
risk: high
---

# Integrate frontend and backend and verify journeys

## Description

Verify the Employee and Manager journeys across the locally running Compose stack, including direct backend authorization and browser accessibility checks.

## Requirements

1. **Verify local stack startup and migration readiness** (R7)
   **Given** the developer has started the regular Compose stack separately from the end-to-end run
   **When** Compose reports the backend healthy
   **Then** the backend has applied all pending Flyway migrations successfully before becoming ready
   **And** the helper does not start or stop the application stack; it starts and removes only the one-shot E2E runner container
   **And** only the frontend port is published; backend and database ports remain private to the Compose network

2. **Create and clean up end-to-end SQL fixtures** (R6, R7)
   **Given** Compose is healthy and backend startup migrations have completed
   **When** the local end-to-end helper sets up its SQL fixtures
   **Then** the tracked `scripts/e2e/fixtures.sql` and `scripts/e2e/cleanup.sql` files define fixture setup and cleanup
   **And** the helper feeds each file to `psql` inside the PostgreSQL container, targets the configured `POSTGRES_DB` and `POSTGRES_USER`, and passes the unique run marker as a psql variable
   **And** both `psql` invocations set `ON_ERROR_STOP=1`, and fixture setup is enclosed in one transaction
   **And** fixture setup runs after migrations and inserts only test-owned Employees, Managers, assignments, and requests
   **And** the helper creates a unique run marker and marker file before setup, uses the marker in fixture account emails and test request reasons, commits the fixture transaction, then captures generated fixture IDs in a per-run `manifest.json`
   **And** the helper mounts that manifest read-only into the Playwright container at `/run/e2e/manifest.json`, and Playwright uses those IDs to select the fixture Employee, Manager, and request
   **And** fixture inserts run in one transaction, so failed setup leaves no partial fixture rows
   **And** the helper registers its shell `EXIT` trap before setup; cleanup then runs after success or failure, finds requests and accounts by the run marker if ID capture failed, and otherwise uses the manifest IDs, deleting only that run's requests, assignments, and accounts
   **And** cleanup does not truncate tables, delete demo seed accounts or their assignment, drop the database, or remove the persistent volume

3. **Verify the Employee journey through the browser** (R1, R2, R3)
   **Given** the seeded Employee can sign in and the local Compose stack is healthy
   **When** the Employee signs in, submits a valid request with a run-marked reason, and returns to the dashboard
   **Then** the shared login routes to the Employee dashboard and the new request appears as Pending with its dates and reason
   **And** invalid dates or a blank reason show validation feedback and create no request
   **And** the request remains visible with its saved values after navigating away and returning to the dashboard

4. **Verify approval and rejection as separate persisted decisions** (R1, R4, R5)
   **Given** two separate run-marked requests are Pending and assigned to the seeded Manager
   **When** the Manager approves the first request and rejects the second through the browser
   **Then** each decision is saved against its own request and shown to the Manager after the decision
   **And** the Manager logs out before the Employee signs in again
   **And** after the Employee signs in, the first request is Approved and the second is Rejected, with no rejection reason shown
   **And** posting another decision for either request with a valid Manager session and valid CSRF token returns OpenAPI status 409 and leaves its original saved status unchanged

5. **Verify authorization through both API paths** (R6)
   **Given** run-scoped fixtures include a second Employee assigned to the second Manager and a request owned by that Employee; the seeded Manager is not assigned to the second Employee
   **When** the Playwright runner sends every authorization case through both the same-origin proxy and directly to Spring Boot from the E2E container on the Compose network
   **Then** anonymous request-list GET, request-detail GET, request-create POST, and decision POST each return 401
   **And** authenticated Manager request-create POST and authenticated Employee decision POST each return 403 only when sent with a valid session cookie and valid CSRF token
   **And** an Employee request-detail GET for the other Employee's request returns 404
   **And** an unassigned seeded-Manager request-detail GET returns 404, and the Manager's decision POST for that request returns 404 only when sent with a valid session cookie and valid CSRF token
   **And** every denied response contains no protected request fields or data
   **And** the direct backend calls use the backend service name and internal port from the E2E container, which joins the same Compose network as the frontend and backend; the backend port remains unpublished
   **And** browser control visibility alone does not count as authorization evidence

6. **Verify keyboard and phone behavior** (R1–R5)
   **Given** the browser runs the Employee and Manager journeys at desktop size and at the existing Playwright phone viewport of 390 × 844 CSS pixels
   **When** a keyboard-only user signs in, submits a request, reviews it, and completes approval and rejection
   **Then** focus follows the visual and reading order and remains visibly indicated
   **And** validation moves focus to the first invalid field and associates the error with that field
   **And** after each decision, focus moves to that request's updated Status element and the final Status is announced in a polite status region
   **And** at 390 × 844, request data is shown as labeled cards, Manager actions remain visible, and the page has no horizontal scrolling
   **And** all keyboard-only assertions in this criterion pass at both desktop and 390 × 844 CSS pixels

7. **Run the local end-to-end verification and check the contract** (R1–R7)
   **Given** the developer has separately run `docker compose up -d --wait --wait-timeout 180` and confirmed frontend, backend, and PostgreSQL health
   **When** the developer runs `./scripts/run-local-e2e.sh`, which creates the run marker and manifest directory, registers cleanup, inserts fixtures after backend health, and runs `docker compose -f compose.yaml -f compose.e2e.yaml run --rm --no-deps` with the manifest and ignored credential file mounted into the `e2e` service before `npm run test:e2e`
   **Then** `--no-deps` prevents the E2E command from starting application services; the helper starts and removes only the one-shot E2E runner and does not start or stop the application stack
   **And** the E2E runner joins the same Compose network as the frontend and backend, so it can reach both by service name while the backend port remains unpublished
   **And** the seeded Employee and Manager credentials are read from the developer's ignored local file at `~/.config/employee-leave-demo/e2e-credentials.env`, mounted read-only at `/run/secrets/e2e-credentials.env`; the file is not copied into the image or printed in logs
   **And** the runner reads the per-run manifest, and fixture cleanup runs whether fixture setup, API checks, or Playwright pass or fail
   **And** each exercised API operation's request, response shape, and expected status matches `contracts/openapi.yaml`, including 409 for a decision on a no-longer-Pending request
   **And** end-to-end checks verify cross-service behavior, persistence, role journeys, proxy forwarding, direct backend authorization, and responsive keyboard interaction without repeating the unit and feature cases covered by Stories 3–5

## References

- parent — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/epic-employee-leave-first-build.md
- predecessor — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/tickets/story-build-employee-leave-submission-and-dashboard.md, Employee request behavior and unit/feature coverage owned by Story 4
- predecessor — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/tickets/story-build-manager-review-and-decisions.md, Manager decision behavior and unit/feature coverage owned by Story 5
- prd — _bmad-output/planning-artifacts/prds/prd-employee-leave-demo-2026-11-13/prd.md, UJ-1, UJ-2, SM-1 through SM-3, and Counter-measure
- architecture — _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/ARCHITECTURE-SPINE.md, AD-1 through AD-8 and Deployment & Operations Envelope
- api contract — _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml
- experience — _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/EXPERIENCE.md, Key Flows, State Patterns, and Accessibility Floor
- design — _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/DESIGN.md, responsive behavior and status/focus styling

## Boundaries

- Must not change: verification covers only the local two-role first pass; no Admin, registration, notifications, rejection rationale, or production deployment.
- Must not change: assertions prove Spring Boot authorization through direct API calls, not only frontend behavior.
- Must not change: the application Compose stack is started and health-checked separately; the helper starts and removes only the one-shot E2E runner container and never starts or stops application services.
- Must not change: alternate owners and assignments exist only as run-scoped test fixtures; the local demo seed remains one Employee and one Manager.
- Must not change: unit and feature cases remain covered by Stories 3–5; Story 6 verifies integrated journeys and cross-service behavior.

## Notes

- Risk: high — a gap between frontend proxy behavior and direct backend behavior could make a successful walkthrough misleading. Extra check: after logout and signing in as the other role, verify that no cached data from the prior account flashes during dashboard loading.
- Decision: The canonical OpenAPI contract defines 409 when a decision targets a request that is no longer Pending; Story 6 asserts that exact status and verifies the stored decision is unchanged.
- Decision: Run-scoped SQL is stored in tracked `scripts/e2e/fixtures.sql` and `scripts/e2e/cleanup.sql`. Setup command: `docker compose exec -T -e E2E_RUN_MARKER="$RUN_MARKER" postgres sh -c 'psql -v ON_ERROR_STOP=1 -v run_marker="$E2E_RUN_MARKER" -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < scripts/e2e/fixtures.sql`. Cleanup uses the same command with `scripts/e2e/cleanup.sql`.
- Decision: Direct backend authorization cases run from the one-shot E2E Compose service against `http://backend:8080`; the same cases also run through the frontend service origin. The E2E service joins the application's Compose network, and the backend port stays unpublished.
- Decision: The second run-scoped Employee is assigned to a second run-scoped Manager; the seeded Manager is unassigned to that Employee's request so the expected 404 is explicit.
- Decision: The local command `./scripts/run-local-e2e.sh` owns fixture setup, manifest and credential mounts, one-shot E2E runner start/removal, Playwright execution, and exit-trap cleanup only; the developer starts and health-checks the application Compose services separately.
- Decision: The one-shot E2E command is `docker compose -f compose.yaml -f compose.e2e.yaml run --rm --no-deps -v "$RUN_DIR:/run/e2e:ro" -v "$HOME/.config/employee-leave-demo/e2e-credentials.env:/run/secrets/e2e-credentials.env:ro" e2e npm run test:e2e`; `RUN_DIR` contains the per-run manifest and is mounted read-only.
