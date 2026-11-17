# Employee Leave Demo

## About this project

This repository is a learning demo of a greenfield build using the BMad Method and specification-driven development. It follows the work from product requirements and UX through architecture, API contracts, story planning, implementation, review, and local end-to-end verification.

The demo is an Employee leave-request workflow. An Employee can submit and track a request; an assigned Manager can review and approve or reject it. The browser talks to Next.js, which proxies API requests to Spring Boot. Spring Boot owns authentication, authorization, validation, and persistence in PostgreSQL.

The focus is helping readers learn the BMad Method and specification-driven development, then apply them hands-on by completing the optional brownfield exercise below. This is a learning demo, not a production-ready service.

## Run the application locally

### Requirements

- Docker with the Compose v2 plugin
- Bash, to run `seed.sh`
- Node.js and npm, to run frontend checks and the local end-to-end helper
- `uv`, to run the BMad ticket-tree commands
- A Codex environment with this repository's project skills, to run BMad workflows

Host Java and Maven are not needed to build and start the application with Docker Compose. They are needed to run the backend Maven tests and coverage report. The [Architecture Spine](_bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/ARCHITECTURE-SPINE.md) is the source of truth for application and toolchain versions; refer to it rather than maintaining a second version list here.

### Configure PostgreSQL

Copy the safe example configuration and set local values in the ignored root `.env` file:

```sh
cp .env.example .env
```

Edit `.env` and set `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`. `SESSION_COOKIE_SECURE` defaults to `false` for local HTTP. Set it to `true` when the browser reaches the app over HTTPS.

### Start the stack and seed demo accounts

Start the services:

```sh
docker compose up -d --build --wait --wait-timeout 180
```

Create the external demo seed file, then review it before running the seed service:

```sh
./seed.sh
```

By default, `seed.sh` creates `~/.config/employee-leave-demo/demo-seed.sql` with owner-only permissions. It contains `employee@test.com` and `manager@test.com`; the demo password is written in that SQL file. If the file already exists, the script leaves it unchanged.

Run the one-shot seed service:

```sh
DEMO_SEED_SQL_FILE="$HOME/.config/employee-leave-demo/demo-seed.sql" \
  docker compose -f compose.yaml -f compose.seed.yaml run --rm seed
```

Spring Boot applies pending Flyway migrations during startup. The seed is a separate, explicit step. Do not use these demo credentials outside this local demo.

Open [http://localhost:3000](http://localhost:3000) after the services are healthy and the accounts are seeded. Only the frontend is published to the host; the backend and database ports remain inside the Compose networks.

Useful commands:

```sh
docker compose ps
docker compose logs -f frontend backend postgres
docker compose stop
```

The database uses a named volume and retains its data across ordinary stops and `docker compose down`. `docker compose down -v` removes the database volume and its data.

## BMad and specification-driven development

This repository uses BMad workflows to turn requirements and contracts into dependency-ordered stories, then implement and review those stories. Invoke the workflows in Codex and provide the project context and task. They are not shell commands.

This table describes the greenfield workflow used for this demo, not every BMad workflow or command. BMad also supports work in existing codebases (brownfield) and optional modules such as Test Architect for test strategy and automation. Available workflows and command names depend on the installed BMad version and modules; consult the official documentation for current options:

- [How BMad works](https://docs.bmad-method.org/start/how-bmad-works/)
- [Start in an existing codebase](https://docs.bmad-method.org/existing-codebases/start-in-an-existing-codebase/)
- [Add modules, including Test Architect](https://docs.bmad-method.org/customize/add-modules/)

| Order | Work | Workflow to invoke | Main artifacts and checkpoint |
|---:|---|---|---|
| 1 | Define product scope | `bmad-prd` | PRD and validation record; review and agree on scope |
| 2 | Define user experience | `bmad-ux` | `EXPERIENCE.md`, `DESIGN.md`, and related UX artifacts; review journeys and interface behavior |
| 3 | Define technical boundaries | `bmad-architecture` | Architecture spine and `contracts/openapi.yaml`; agree on service boundaries and API contract |
| 4 | Create implementation tickets | `bmad-agent-po` with `TICKETS` | Initiative, epic, story files, and ticket tree; check dependencies and story order |
| 5 | Refine a story | `bmad-agent-po` with `REFINE` | Updated story acceptance criteria; approve the story before building it |
| 6 | Build a story | `bmad-build` | Story plan, implementation, and verification evidence; review the plan before implementation |
| 7 | Review a story | `bmad-code-review` | Findings and dispositions in the plan; mark the story done only if the review passes |
| 8 | Review the completed epic | `bmad-retrospective` | Epic retrospective and acceptance verdict; run after the epic's stories are complete |

Typical workflow:

1. Capture the product problem and requirements in a PRD.
2. Define the user journeys, interface behavior, and accessibility expectations in UX artifacts.
3. Agree on architecture, service boundaries, and API contracts.
4. Use `bmad-agent-po` with `TICKETS` to create the initiative, epic, and dependency-ordered stories.
5. Use `bmad-agent-po` with `REFINE` to refine each story, then approve its acceptance criteria before starting the build.
6. Build one story at a time. Follow the plan checkpoint, implement the story, and record only verification that was actually run.
7. Review the implementation against the refined story and plan. If the review does not pass, keep the story in review and address the findings.
8. After all stories are complete, run the epic retrospective. The retrospective records lessons and an acceptance verdict; it does not replace ticket status updates.

### PRD prompt used

<details>
<summary>Click to view the original PRD prompt</summary>

```text
Create a PRD for a simple employee leave application.

First-pass requirements:
- No public registration.
- Provide a login screen for two seeded demo users: one Employee and one Manager.
- After login, show the dashboard appropriate to the user's role.
- An Employee can submit leave dates and a reason for requesting leave.
- An Employee can see their own requests and whether each is Pending, Approved, or Rejected.
- A Manager can see leave requests from employees assigned to them and approve or reject them.
- A Manager can only see and decide requests from employees assigned to them.
- A Manager does not enter a rejection reason in this first pass.
- The Employee can see Approved or Rejected status, but not a rejection reason.
- The backend must enforce access rules; hiding controls in the frontend is not sufficient.
- Exclude registration, an Admin role, Keycloak, notifications, and production deployment.

Include user journeys, permissions, acceptance criteria, and out-of-scope items.
```


</details>

### Brownfield exercise: add rejection reasons

<details>
<summary>Click to open the brownfield exercise</summary>

The first-pass scope deliberately excludes rejection reasons. Use this as an optional brownfield exercise: let a Manager enter a rejection reason and show the saved reason to the owning Employee.

Use the [BMad guide for an existing codebase](https://docs.bmad-method.org/existing-codebases/start-in-an-existing-codebase/) for guidance. Treat the current code, tickets, API contract, migrations, and tests as the baseline. Create a new change; do not rewrite the original first-pass scope.

ATDD does not require Test Architect (TEA). If TEA is installed, its Automate workflow in red mode can scaffold acceptance tests before implementation. In current Codex installations, the command is `$bmad-tea-automate`; check the [TEA command reference](https://github.com/bmad-code-org/bmad-method-test-architecture-enterprise/blob/main/docs/reference/commands.md) for your installed version. Test Design is optional for this focused change.

Exercise steps:

1. **Refine one vertical story** with `bmad-agent-po`: define the Manager input, validation, persistence, Employee visibility, and access restrictions.
2. **Update the API contract** with `bmad-architecture`: specify the decision request and Employee response before implementation.
3. **Write tests first** from the acceptance criteria and OpenAPI contract: API-level tests, focused UI tests, and Playwright E2E tests. Cover a Manager rejecting with a reason and the owning Employee seeing it after signing in again; also verify an unrelated Employee cannot see that reason. Run the tests and confirm the expected failures.
4. **Build the same story in two tasks:** implement the migration and backend API first; then connect the Manager and Employee UI. Run the tests until they pass.
5. **Review** with `bmad-code-review`; address findings and record verification in the story plan.

Keep this as one story because the outcome is one end-to-end behavior. Split backend and frontend into dependent stories only if they need to be delivered or worked on independently.

The exercise is complete when the rejection reason persists, the owning Employee can see it after signing in, other users cannot see it, and existing journeys still work.

</details>

### Project artifacts

| Path | Purpose |
|---|---|
| `_bmad-output/planning-artifacts/prds/` | Product requirements and validation records |
| `_bmad-output/planning-artifacts/ux-designs/` | UX journeys, accessibility behavior, visual design, and mockups |
| `_bmad-output/planning-artifacts/architecture/` | Architecture decisions, service boundaries, and API contracts |
| `_bmad-output/initiative-employee-leave-demo/` | Initiative requirements and ticket tree |
| `_bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/` | Epic definition, `tickets.toml`, story files, plans, and retrospective |
| `_bmad/` | BMad configuration, ticket-tree scripts, and module metadata |
| `.agents/skills/` | Project-installed BMad workflows and their instructions |

Inspect the ticket tree from a terminal:

```sh
uv run _bmad/method/scripts/tickets.py --project-root . status _bmad-output/initiative-employee-leave-demo
uv run _bmad/method/scripts/tickets.py --project-root . find _bmad-output/initiative-employee-leave-demo 1.6
```

The first command lists the initiative's epics and stories with dependency and status information. The second resolves story reference `1.6` to its story, plan, and current ticket state.

## Run tests, coverage, and lint

### Backend tests and coverage

Run the backend test suite from the `backend` directory. The Maven `verify` lifecycle runs unit tests and PostgreSQL integration tests using Testcontainers; Docker must be running. It also generates a JaCoCo coverage report for maintained backend code, excluding generated OpenAPI models.

```sh
cd backend
./mvnw verify
```

Open the report at `backend/target/site/jacoco/index.html` after the command succeeds.

### Frontend tests, coverage, and lint

Install frontend dependencies once, then run unit tests with or without coverage from the `frontend` directory:

```sh
cd frontend
npm ci
npm run test:unit
npm run test:coverage
npm run lint
```

The frontend coverage command writes an HTML report to `frontend/coverage/lcov-report/index.html`. Lint uses the Next.js and TypeScript ESLint rules. Story 1 readiness/outage checks and Story 2 schema/seed checks also include documented manual Compose and `psql` verification.

## Run local end-to-end checks

Start and health-check the application stack using the commands above, then seed the demo accounts.

Create an external credentials file at `~/.config/employee-leave-demo/e2e-credentials.env`. Its values must match the accounts in the external seed SQL file:

```dotenv
DEMO_EMPLOYEE_EMAIL=employee@test.com
DEMO_EMPLOYEE_PASSWORD=<the Employee password from demo-seed.sql>
DEMO_MANAGER_EMAIL=manager@test.com
DEMO_MANAGER_PASSWORD=<the Manager password from demo-seed.sql>
```

Keep this file outside the repository and restrict access:

```sh
chmod 600 ~/.config/employee-leave-demo/e2e-credentials.env
```

Run the local end-to-end helper:

```sh
./scripts/run-local-e2e.sh
```

To use a credentials file at another location:

```sh
E2E_CREDENTIALS_FILE="/path/to/e2e-credentials.env" ./scripts/run-local-e2e.sh
```

The helper creates run-scoped database fixtures, runs Playwright in a one-shot container on the application network, and attempts fixture cleanup after success or failure. It does not start or stop the application services. If cleanup fails, it reports the failure and preserves the run information for recovery.

These are local checks; the project does not require CI to run them.

## Repository layout

```text
backend/                 Spring Boot API and Flyway migrations
frontend/                Next.js application, unit tests, and Playwright tests
scripts/                 Local seed and E2E fixture lifecycle helpers
compose.yaml             PostgreSQL, backend, and frontend services
compose.seed.yaml        Explicit one-shot demo account seeding
compose.e2e.yaml         One-shot local Playwright runner
_bmad-output/             Product, UX, architecture, initiative, and ticket artifacts
_bmad/                    BMad configuration and ticket tooling
```
