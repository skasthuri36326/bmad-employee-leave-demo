---
title: 'Create schema and seed demo accounts'
type: feature
ticket: '2'
created: '2026-11-14'
status: done
baseline_revision: 'NO_VCS'
route: oneshot
route_source: auto
risk: high
review: quick
review_source: pinned
lenses_ran: [quick]
failed_layers: ''
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 2 needs a repository-managed schema for the two demo roles and their assignment, with migrations complete before the backend reports ready. Demo credentials must remain developer-owned and outside the repository.

**Approach:** Add a versioned Flyway migration for the account and assignment tables and PostgreSQL `pgcrypto`. Keep the normal Compose stack and image build usable without a demo seed file; seed only through an explicit Compose overlay that mounts the developer's external SQL file read-only and runs it transactionally with `psql`.

</frozen-after-approval>

## Implementation Notes

This is a cohesive change across four files and fewer than 100 expected added or modified lines, so the oneshot route applies. Existing `ReadinessController` only checks PostgreSQL connectivity; Spring Boot must complete Flyway migrations before the backend healthcheck succeeds. `backend/Dockerfile` already packages all of `src` and runs `./mvnw -B verify`, so it needs no change. The existing anonymous security test uses H2; disable Flyway in that test context because the production migration enables PostgreSQL `pgcrypto`, while preserving the security assertions. Keep `compose.yaml` unchanged and do not create or invent the external demo SQL file. After the migration is applied and checked, pause for the developer to create `~/.config/employee-leave-demo/demo-seed.sql`; full seed verification depends on that human-provided file.

- Implemented: added Flyway dependencies, a versioned migration with account/role and role-constrained assignment tables, an opt-in `compose.seed.yaml` secret mount using `psql` single-transaction mode, and disabled Flyway only for the existing H2 security-test context. The default `compose.yaml` remains unchanged.
- Environment: this workspace has no Git HEAD, so `baseline_revision` is `NO_VCS`; the pre-change files are saved under `/private/tmp/story2-build-baseline/` for comparison. No repository-wide commit was made.

## Plan Change Log

## Review Triage Log

- false — `compose.seed.yaml:19`: the reviewer inferred that explicit transaction control in the external seed could allow statements after `COMMIT` to escape `psql -1`; a metadata-only scan found `COMMIT` at line 43, the last executable line, so no seed statements follow it and the repeat run completed with the expected aggregate data.

## Verification

**Commands:**
- `DOCKER_CONFIG=/tmp/employee-leave-demo-docker-config docker compose build` -- passed; frontend and backend images built without `DEMO_SEED_SQL_FILE`, including backend `./mvnw -B verify` in the Docker build.
- `DOCKER_CONFIG=/tmp/employee-leave-demo-docker-config docker compose up -d --build --wait --wait-timeout 120` -- passed; PostgreSQL, backend, and frontend became healthy without loading the seed overlay.
- `psql` checks in the PostgreSQL container -- passed: Flyway version 1 succeeded; both `app_user` and `employee_manager_assignment` exist; `pgcrypto` is installed; both tables contain zero rows.
- `DEMO_SEED_SQL_FILE="$HOME/.config/employee-leave-demo/demo-seed.sql" DOCKER_CONFIG=/tmp/employee-leave-demo-docker-config docker compose -f compose.yaml -f compose.seed.yaml run --rm seed` -- passed on the requested repeat run (exit 0); the seed service emitted transaction-already-active / no-transaction warnings, but no credentials or hashes.
- Post-repeat `psql` aggregate checks -- passed: one `EMPLOYEE` row with a valid 60-character `$2a$10$` hash, one `MANAGER` row with a valid 60-character `$2a$10$` hash, one assignment, and one joined Employee-to-Manager assignment.

**Manual checks:**
- Pre-seed `psql` checks (earlier in this build) passed: successful Flyway history row, both required tables, the `pgcrypto` extension, and zero account rows.
- The developer reported one account per role, one assignment, valid hash formats, and the Employee-to-Manager link before the repeat run. After the repeat run, the aggregate `psql` checks above confirmed those same counts, formats, and relationship without selecting or printing credential or hash values. The first hash-format query in this run was incorrectly shell-escaped and returned zero; a corrected shell-safe predicate returned one valid hash per role.
- `rg -n 'seed|DEMO_SEED_SQL_FILE' compose.yaml` returned no matches; the default build and startup above succeeded without loading the seed overlay or requiring the external SQL file.

**Current result:** default-stack build, startup, schema, repeat seed, and post-repeat aggregate checks passed. The repeat seed exited successfully with transaction boundary warnings from the supplied seed SQL; no credentials or hashes appeared in output.

## Code Review

### 2026-11-14

✅ Clean review — all lenses passed.

**Code review complete.** 0 decision-needed, 0 patch, 0 defer, 5 rejected. Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, and Intent Alignment Auditor all returned non-empty results; no lens failed.

**Rejected**

- R1 (`blind-hunter`), false: `pgcrypto` is a trusted PostgreSQL 18 extension installable by a non-superuser with database `CREATE` privilege, and the supported Compose setup initializes `POSTGRES_USER` as the database superuser. The migration and schema startup checks also passed. [PostgreSQL pgcrypto documentation](https://www.postgresql.org/docs/18/pgcrypto.html)
- R2 (`blind-hunter`), false: a checked-in seed template is not required; the approved workflow has the developer create the owner-only external SQL after migration, and the supplied external file was run and checked.
- R3 (`edge-case-hunter`), false: the hash constraint enforces the explicitly approved 60-character `$2a$10$` format; both seeded hashes passed the aggregate format check.
- R4 (`edge-case-hunter`), false: assignment role columns are `NOT NULL`; explicit nulls cannot pass those constraints, and omitted values use the fixed role defaults and composite foreign keys.
- R5 (`intent-alignment`), false: Spring Boot runs Flyway during backend startup; the regular stack became healthy with Flyway version 1 applied. Seed SQL is intentionally external, and the repeat seed plus post-run aggregate checks passed. The unchanged default Compose and readiness files left no approved criterion unmet.
