# Architecture Spine Rubric Recheck — Readiness and Flyway

**Reviewed:** Current `ARCHITECTURE-SPINE.md` and its updated AD-4, AD-6, and Deployment & Operations Envelope.

**Verdict:** The prior readiness and sole-schema-owner findings are resolved. The Flyway decision is accurate and sufficiently enforceable for this architecture update. No remaining finding blocks the requested update.

## Recheck findings

### Readiness — resolved

The deployment envelope now makes the readiness behavior concrete: Spring Boot runs Flyway during startup; the internal `GET /internal/ready` probe executes `SELECT 1`; Compose uses it for backend health and gates frontend startup on backend health. The probe is explicitly outside product API operations. This removes the earlier open choice about endpoint and database-health semantics. The spine also accurately distinguishes failed migrations (which prevent successful backend startup) from the subsequent readiness probe.

Spring Boot documents calling `Flyway.migrate()` during startup and running migrations before the application is ready for normal operation in its database initialization guidance: [Spring Boot database initialization](https://docs.spring.io/spring-boot/how-to/data-initialization.html). The application availability lifecycle is described [here](https://docs.spring.io/spring-boot/reference/features/spring-application.html).

### Sole schema owner — resolved

AD-4 explicitly makes Flyway the sole schema-change mechanism, defines one ordered backend migration history, requires unique increasing versions and prerequisite ordering, and prohibits mixing Hibernate DDL or `schema.sql`/`data.sql` schema initialization with Flyway. This is clear enough to prevent competing schema-generation choices. The updated AD-6 also rules out using pre-Flyway PostgreSQL initialization scripts for application seed data.

This aligns with Spring Boot’s recommendation to use one database schema initialization mechanism and not combine basic SQL initialization with Flyway: [Spring Boot database initialization](https://docs.spring.io/spring-boot/how-to/data-initialization.html).

### Flyway decision — accurate and enforceable

- `spring-boot-starter-flyway` is a Spring Boot 4.1.2 managed coordinate; PostgreSQL requires `org.flywaydb:flyway-database-postgresql`. Spring Boot’s current documentation names both requirements and states that versions can be managed by Boot. See [database initialization](https://docs.spring.io/spring-boot/how-to/data-initialization.html) and [managed dependency coordinates](https://docs.spring.io/spring-boot/appendix/dependency-versions/coordinates.html).
- `backend/src/main/resources/db/migration` is the conventional source directory and maps to Spring Boot’s default `classpath:db/migration` location in the packaged app. The versioned SQL migration pattern is consistent with Spring Boot’s documented naming convention.
- Running migrations during startup before backend readiness is compatible with Boot’s migration lifecycle. Compose provisioning is explicitly gated on backend readiness, avoiding seed setup before the schema exists.
- The rules specify the tool, owner, location, ordering, dependency modules, and disallowed competing mechanisms; implementation choices cannot silently switch to another migration approach.

## Checklist

- **Divergence points:** The updated text closes the two findings from the previous review. The specific readiness endpoint and DB check are now fixed; competing schema initialization is expressly forbidden.
- **Deferred choices:** No deferred choice reopens these decisions. Patch pins remain implementation details, while the schema history and startup behavior are bound.
- **Requirements and operations:** The architecture continues to cover the linked FR/UJ scope and local Compose operations. Production deployment remains explicitly deferred/out of scope.
- **Blocking issues:** None identified for this requested update.

## Conclusion

Accept. The readiness probe now has a concrete internal contract, and Flyway is the sole schema owner with its Spring Boot integration correctly specified.
