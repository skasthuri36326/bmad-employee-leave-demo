# Architecture Spine Final Review — Flyway Update

**Reviewed:** Current architecture spine and OpenAPI contract, including latest display-name and startup-wording edits.

**Verdict:** Accept. The prior findings remain resolved, and no remaining blocker to the Flyway architecture update was found.

## Recheck

- **Readiness and migration failure:** The deployment envelope says Flyway runs during application startup and that migration failure fails startup, preventing backend readiness from becoming healthy. The internal `/internal/ready` probe executes `SELECT 1`; Compose waits for backend health before starting the frontend. These details are mutually consistent and explicit enough for the local build contract. Spring Boot documents startup migrations and calls `Flyway.migrate()` as part of application startup [in its database initialization guidance](https://docs.spring.io/spring-boot/how-to/data-initialization.html).
- **Sole schema owner:** AD-4 designates Flyway as the sole schema-change mechanism, assigns one backend migration history, requires unique increasing versions and prerequisite ordering, and disallows Hibernate DDL or schema/data scripts as parallel schema initializers. AD-6 also excludes pre-Flyway PostgreSQL initialization scripts for app seeding. This resolves the earlier competing-initializer concern.
- **Flyway integration:** `spring-boot-starter-flyway` plus `org.flywaydb:flyway-database-postgresql` is the documented Spring Boot/PostgreSQL integration. The resource directory `backend/src/main/resources/db/migration` corresponds to the default packaged classpath location `classpath:db/migration`; SQL versioned migration naming and startup execution agree with the official documentation. Spring Boot’s managed dependency coordinates include the starter [here](https://docs.spring.io/spring-boot/appendix/dependency-versions/coordinates.html).
- **Display name:** AD-4 now identifies PostgreSQL’s stored display name as authoritative for `/api/me` and Manager response names. OpenAPI `CurrentUser` requires `displayName`; `ManagerLeaveRequest` requires `employeeName`; Employee request responses do not carry unnecessary identity fields. The former display-name source ambiguity is resolved.
- **Requirements and deferred decisions:** The first-pass FR/UJ capabilities remain covered; pagination and confirmation-dialog choices do not reopen backend ownership, persistence, or migration decisions. Local operations are specified, and production deployment remains explicitly out of scope.

## Findings

None. The spine is ready for the requested Flyway architecture update.
