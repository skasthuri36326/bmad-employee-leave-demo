# Story 1 and Story 2 Alignment Rubric Review

**Verdict: PASS.** The current spine aligns with the approved Story 1 decisions and selected Story 2 schema/seed decisions, while preserving the existing architecture contract. No findings.

## Scope

Reviewed `ARCHITECTURE-SPINE.md` against the good-spine checklist and the requested alignment points in Story 1 and Story 2. The review did not modify the spine or inspect/update PRD, UX, OpenAPI, or other stories.

## Checklist and alignment

- **Decision coverage and enforceability:** The spine names its layered Next.js/Spring Boot/PostgreSQL paradigm, enforces the same-origin proxy and backend authorization boundaries, assigns schema and persistence ownership, defines atomic decision mutation, and covers local operations. AD-1 through AD-8 carry Binds, Prevents, and Rule statements. The structural seed, deployment envelope, and deferred items complement those invariants without an obvious competing implementation path for this requested slice.
- **Story 1 version lines:** Stack Seed uses exact versions only where selected: Next.js 16.4.6, Spring Boot 4.1.2, and PostgreSQL 18.7. It retains Node.js 26 LTS, TypeScript 5.x, Java 25, Maven 3.9.x wrapper, and Docker Compose v2 as broader lines, and explicitly rejects additional patch pins and image digests. This matches Story 1.
- **Story 1 protected POST behavior:** AD-3 says session authentication precedes CSRF for session-protected POSTs: anonymous/missing/invalid sessions yield 401 even with absent or invalid CSRF, while authenticated requests with bad/missing CSRF yield 403. It separately says login is not session-protected but still requires valid CSRF. This matches Story 1's anonymous scaffold behavior and its deferred authenticated runtime check.
- **Story 2 schema and Flyway ownership:** AD-4 establishes Flyway as the sole schema-change mechanism, a single ordered backend migration history, required PostgreSQL Flyway dependencies without individually pinned versions, and startup migration before readiness. AD-6 requires the seed to run after healthy PostgreSQL and successful Flyway readiness. Together these decisions make the account/assignment schema precede provisioning.
- **Story 2 one-shot seed and secret boundary:** AD-6 specifies an explicitly invoked one-shot Compose seed service, separate from default application startup. It mounts the developer-created external SQL file as a read-only Compose secret, runs it with `psql -v ON_ERROR_STOP=1`, and requires a transaction. It uses PostgreSQL `pgcrypto` `crypt(password, gen_salt('bf', 10))`; missing secret/function or seed failure must fail without partial data or defaults. It rules out PostgreSQL initialization scripts and provisioning APIs. The deployment envelope repeats the lifecycle and secret handling consistently.
- **Preservation of unrelated decisions:** The changes reflected in this spine retain role/ownership rules, API contract ownership, date semantics, keyboard behavior, data model, service topology, and scope exclusions. No conflicting instruction or unrequested alternative was found in the reviewed spine.
- **Deferred and altitude coverage:** Deferred items concern pagination/filtering/ordering and an optional UX confirmation dialog; neither leaves a Story 1/2 alignment choice open. The operational envelope states local Compose behavior, readiness ordering, private ports, persistence, and credential source.

## Findings

None.
