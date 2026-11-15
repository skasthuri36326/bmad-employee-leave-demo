---
id: 2
type: story
title: "Create schema and seed demo accounts"
parent: epic-employee-leave-first-build
covers: [R7, R6]
after: [1]
refined: true
hitl: true
risk: high
---

# Create schema and seed demo accounts

## Description

Flyway creates the account and assignment schema before backend readiness; after that migration is applied, the developer creates an owner-only SQL file outside the repository and explicitly runs a one-shot Compose service to seed the two demo accounts, their assignment, and BCrypt password hashes.

## Requirements

1. **Create the account and assignment schema before seeding** (R7)
   **Given** the required Story 1 PostgreSQL runtime values are configured and PostgreSQL is healthy
   **When** the backend starts the regular Compose stack
   **Then** a versioned Flyway SQL migration creates the account table with a unique email, display name, password hash, and role restricted to Employee or Manager
   **And** the assignment table references existing accounts, permits at most one Manager assignment per Employee, and enforces the Employee and Manager roles
   **And** Flyway enables PostgreSQL `pgcrypto` before backend readiness and before the seed service can run
   **And** a migration failure prevents the backend from becoming healthy
   **And** Flyway is the only schema initialization path; PostgreSQL initialization scripts, `schema.sql`, and `data.sql` do not create or seed these records

2. **Keep the regular image build and Compose stack independent of the seed file** (R7)
   **Given** the required Story 1 PostgreSQL runtime values are configured and no demo SQL seed file exists
   **When** the developer builds the images and runs `docker compose up` using the regular `compose.yaml`
   **Then** the image build and the frontend, backend, and PostgreSQL services start successfully
   **And** Flyway creates the schema and the backend becomes healthy without demo accounts
   **And** the regular Compose file does not declare or start the seed service and does not require `DEMO_SEED_SQL_FILE`

3. **Provide demo credentials only through an explicit external seed file** (R7)
   **Given** Flyway has applied the schema and the developer has created demo-only Employee and Manager credentials
   **When** the developer stores the SQL file at `~/.config/employee-leave-demo/demo-seed.sql` with owner-only permissions and explicitly runs `DEMO_SEED_SQL_FILE="$HOME/.config/employee-leave-demo/demo-seed.sql" docker compose -f compose.yaml -f compose.seed.yaml run --rm seed`
   **Then** the opt-in seed service waits for PostgreSQL health and backend health, which confirms Flyway startup completed
   **And** only the opt-in seed service receives the external SQL file as a read-only Compose secret at `/run/secrets/demo-seed.sql`
   **And** a missing or unreadable file fails the seed command without affecting regular image builds or `docker compose up`
   **And** credential values and usable hashes are absent from tracked files, build arguments, images, and service logs

4. **Seed the two accounts and assignment transactionally with BCrypt hashes** (R7)
   **Given** Flyway has completed and the external seed file contains both demo accounts' credentials
   **When** the one-shot seed service runs `psql -v ON_ERROR_STOP=1` with the seed statements in a transaction
   **Then** PostgreSQL `pgcrypto` creates a separately salted BCrypt-compatible hash for each password using `crypt(password, gen_salt('bf', 10))`
   **And** each stored password is a 60-character `$2a$10$` hash supported by Spring's `BCryptPasswordEncoder`; Story 3 verifies login for both accounts
   **And** the transaction creates exactly one Employee, one Manager, and their assignment, without printing credentials or hashes
   **And** rerunning the seed for the same accounts and assignment succeeds without duplicates or changing the assignment
   **And** a missing credential, unavailable hashing function, or SQL error fails without committing partial account or assignment rows or creating a default account

5. **Verify schema and seeding with Compose and psql** (R7)
   **Given** the regular stack is running and, for full seed verification, the developer has created the external SQL file after the migration defines the schema
   **When** the developer uses Docker Compose and `psql` checks before and after the explicit seed run
   **Then** the checks confirm the migration history, required tables, and `pgcrypto` exist before seeding, and no demo accounts are created by regular `docker compose up`
   **And** after seeding, the checks confirm exactly one account per role, one Employee-to-Manager assignment, and correctly formatted BCrypt hashes without displaying credential or hash values
   **And** a repeat seed leaves the account counts and assignment unchanged

6. **Keep provisioning out of the public API** (R6)
   **Given** account and assignment records are created for the local demo
   **When** a browser or HTTP caller attempts to create an account, assign a role, or create an Employee-to-Manager assignment
   **Then** no public API operation provides those mutations
   **And** the local out-of-band seed is the only account, role, and assignment creation path
   **And** no account or assignment data is exposed to an unauthenticated caller

## References

- parent — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/epic-employee-leave-first-build.md
- prd — _bmad-output/planning-artifacts/prds/prd-employee-leave-demo-2026-11-13/prd.md, FR-1, FR-2, §5.1 and §7.1
- architecture — _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/ARCHITECTURE-SPINE.md, AD-4, AD-6, Deployment & Operations Envelope, and Deferred
- api contract — _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml, no account/assignment provisioning operation
- PostgreSQL docs — https://www.postgresql.org/docs/18/pgcrypto.html, F.26.2 password hashing functions
- Spring Security API — https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/crypto/bcrypt/BCryptPasswordEncoder.html, BCrypt versions and matching

## Boundaries

- Must not change: only Employee and Manager roles exist; the seed must not introduce an Admin account or browser-facing account/assignment management.
- Must not change: plaintext credentials remain outside the repository and only BCrypt hashes are stored.
- Must not change: the default Compose stack contains only the frontend, backend, and PostgreSQL and does not require the external demo SQL file; the seed service remains opt-in in `compose.seed.yaml`.
- Must not change: this story creates the schema and demo seed only; login, sessions, CSRF handling, and role lookup remain in Story 3.
- No automated integration test suite is required for the schema or seed; verify these behaviors with the specified Compose and `psql` checks.

## Notes

- Decision: 2026-11-14 — Use the architecture's versioned Flyway SQL migration for schema creation and to enable PostgreSQL `pgcrypto` before backend readiness and before the seed service runs.
- Decision: 2026-11-14 — Use PostgreSQL `gen_salt('bf', 10)` for the seed hashes. This matches Spring's BCrypt default work factor; Story 3 verifies login against the seeded hashes.
- Decision: 2026-11-14 — Regular `docker compose build` and `docker compose up` must work without the external demo SQL file; only the explicit seed Compose file requires it.
- Decision: 2026-11-14 — Verify migration and seed behavior with Compose and `psql`; no automated schema/seed integration tests are required.
- Decision: 2026-11-14 — The developer creates the owner-only external demo SQL file after Flyway defines the schema; full seed verification waits for that file.
- Decision: 2026-11-14 — Login, sessions, CSRF handling, and role lookup remain in Story 3.
- Risk: high — leaked credentials, a hashing mismatch, or incorrect role/assignment data can break login and access boundaries. Extra check: verify the external seed file has owner-only permissions, is absent from tracked files and image layers, and its contents never appear in Compose logs.
- HITL: after Flyway has defined the schema, the developer creates the local SQL seed file outside the repository with demo-only Employee and Manager credentials, then runs the seed and its `psql` verification. Example location: `~/.config/employee-leave-demo/demo-seed.sql`.
