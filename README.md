# Employee Leave Demo

## About this project

This repository is a learning demo for understanding a greenfield build with the BMad Method and specification-driven development. It follows the work from product requirements, UX and architecture through API contracts, dependency-ordered stories, implementation, code review, and local end-to-end verification.

The result is a local Employee leave-request workflow built with Next.js, Spring Boot, and PostgreSQL. The focus is demonstrating the development process and its artifacts, rather than providing a production-ready service.

A local demo of an Employee leave-request workflow. An Employee can submit and track a request; an assigned Manager can review it and approve or reject it. The browser talks to Next.js, which proxies API requests to Spring Boot. Spring Boot owns authentication, authorization, validation, and persistence in PostgreSQL.

## Run the application locally

### Requirements

- Docker with the Compose v2 plugin

### Configure PostgreSQL

Copy the safe example configuration and set local values in the ignored root `.env` file:

```sh
cp .env.example .env
```

Set `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`. `SESSION_COOKIE_SECURE` defaults to `false` for local HTTP.

### Start the stack and seed demo accounts

```sh
docker compose up -d --build --wait --wait-timeout 180
./seed.sh
DEMO_SEED_SQL_FILE="$HOME/.config/employee-leave-demo/demo-seed.sql" \
  docker compose -f compose.yaml -f compose.seed.yaml run --rm seed
```

Compose starts PostgreSQL, Spring Boot, and Next.js. Spring Boot applies pending Flyway migrations during startup; backend health becomes ready after startup and database readiness checks pass. The seed command is an explicit, separate step. `seed.sh` creates the local SQL seed file outside the repository with owner-only permissions. Review that file before running the seed service. Its default demo accounts are `employee@test.com` and `manager@test.com`, with the local demo password defined in that SQL file. Change those values before sharing the demo. If you already have a seed file from an earlier version, update its Manager email too: `seed.sh` deliberately leaves an existing file unchanged.

Open [http://localhost:3000](http://localhost:3000) after the services are healthy and the accounts are seeded. Only the frontend is published to the host; backend and database ports remain inside the Compose networks.

Useful commands:

```sh
docker compose ps
docker compose logs -f frontend backend postgres
docker compose stop
```

The database uses a named volume and remains across ordinary stops and `docker compose down`. `docker compose down -v` removes the database volume and its data.

## BMad and spec-driven development

This repository uses the BMad Method as a sequence of artifacts and decisions. Requirements and contracts guide implementation; story-sized work is planned, built, reviewed, and verified against those artifacts.

### Tooling

- `uv` runs the ticket-tree utility from the command line.
- A Codex environment with this repository's project skills runs the BMad workflows.

In a Codex session with the project skills available, invoke the skills by name. These are assistant workflows, not shell commands:

| Work | Skill | Main artifact |
| --- | --- | --- |
| Define product requirements | `bmad-prd` | PRD with scope, requirements, and success measures |
| Define user experience | `bmad-ux` | `EXPERIENCE.md` and `DESIGN.md` |
| Define technical boundaries | `bmad-architecture` | Architecture spine and OpenAPI contract |
| Slice and refine implementation work | `bmad-agent-po` or `bmad-create-epics-and-stories` | Initiative, epic, story files, and ticket tree |
| Implement a story | `bmad-build` | Story plan, implementation, and verification evidence |
| Review implementation | `bmad-code-review` | Findings and dispositions recorded with the plan |
| Review a completed epic | `bmad-retrospective` | Epic retrospective and acceptance verdict |

Typical flow:

1. Capture the product problem and requirements in a PRD.
2. Define the user journeys and interface behavior in UX artifacts.
3. Agree on architecture, service boundaries, and API contracts.
4. Create an initiative, epics, and dependency-ordered stories. Refine acceptance criteria so each can be checked.
5. Build one story at a time, using its requirements and linked artifacts as the implementation contract.
6. Review the code and plan, resolve findings, and record verification.
7. Run a retrospective after the epic is complete. The retrospective records evidence and a verdict; it does not change ticket status.

### Project artifacts

| Path | Purpose |
| --- | --- |
| `_bmad-output/planning-artifacts/prds/` | Product requirements and validation records |
| `_bmad-output/planning-artifacts/ux-designs/` | UX journeys, accessibility behavior, visual design, and mockups |
| `_bmad-output/planning-artifacts/architecture/` | Architecture decisions, service boundaries, and `contracts/openapi.yaml` |
| `_bmad-output/initiative-employee-leave-demo/` | Initiative requirements and ticket tree |
| `_bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/` | Epic definition, `tickets.toml`, story files, implementation plans, and retrospective |
| `_bmad/` | BMad configuration, ticket-tree scripts, and module metadata |
| `.agents/skills/` | Project-installed BMad workflows and their instructions |

Inspect the ticket tree from a terminal:

```sh
uv run _bmad/method/scripts/tickets.py --project-root . status _bmad-output/initiative-employee-leave-demo
uv run _bmad/method/scripts/tickets.py --project-root . find _bmad-output/initiative-employee-leave-demo 1.6
```

The first command lists the initiative's epics and stories with their dependency and status information. The second resolves story reference `1.6` to its story, plan, and current ticket state.

## Run local end-to-end checks

Start and health-check the application stack first using the commands above. Seed the demo accounts, then create an external E2E credentials file at `~/.config/employee-leave-demo/e2e-credentials.env`. It must contain `DEMO_EMPLOYEE_EMAIL`, `DEMO_EMPLOYEE_PASSWORD`, `DEMO_MANAGER_EMAIL`, and `DEMO_MANAGER_PASSWORD`, with values matching the seeded accounts. Keep it outside the repository and restrict access with `chmod 600 ~/.config/employee-leave-demo/e2e-credentials.env`. To use another location, set `E2E_CREDENTIALS_FILE`.

```sh
./scripts/run-local-e2e.sh
```

The helper creates run-scoped database fixtures, runs Playwright in a one-shot container on the application network, and attempts fixture cleanup after success or failure. If PostgreSQL is unavailable during cleanup or cleanup otherwise fails, the helper reports the error and preserves the run directory, including the run marker and manifest when created, for recovery. It does not start or stop the application services. These are local checks; the project does not require CI to run them.

## Repository layout

```text
backend/                 Spring Boot API and Flyway migrations
frontend/                Next.js application and Playwright tests
scripts/                 Local seed and E2E fixture lifecycle helpers
compose.yaml             PostgreSQL, backend, and frontend services
compose.seed.yaml        Explicit one-shot demo account seeding
compose.e2e.yaml         One-shot local Playwright runner
_bmad-output/             Product, UX, architecture, initiative, and ticket artifacts
_bmad/                    BMad configuration and ticket tooling
```
