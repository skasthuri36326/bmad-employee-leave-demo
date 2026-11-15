# Technology Verification Recheck — Flyway

**Artifact:** `ARCHITECTURE-SPINE.md`  
**Lens:** Recheck Flyway coordinates, Boot-managed versions, migration location, and startup/readiness against official documentation and repository state.  
**Verdict:** **Pass with one low-severity wording finding.**

## Verified

- **Dependency names are exact.** Spring Boot's 4.1.2 managed coordinates list `org.springframework.boot:spring-boot-starter-flyway` at 4.1.2. Boot's database initialization guide names `org.flywaydb:flyway-database-postgresql` as the PostgreSQL-specific module to add. The Boot 4.1.2 coordinates list manages it at Flyway 12.4.0. The repository parent is already `spring-boot-starter-parent` 4.1.2, so both can be declared without versions.
- **Migration path is correct.** Boot documents Flyway's default as `classpath:db/migration`; with Maven resources, that maps to `backend/src/main/resources/db/migration`. Boot recommends relying on one schema initialization mechanism, supporting the spine's rule against mixing Flyway with Hibernate DDL or `schema.sql`/`data.sql` schema creation.
- **Readiness ordering is correct.** Boot documents database initialization as part of application startup/context refresh. Its lifecycle documentation states the application remains `REFUSING_TRAFFIC` during startup tasks and changes to `ACCEPTING_TRAFFIC` once startup tasks finish. Therefore, normal Boot Flyway migration completes before the application becomes ready. The repository's `/internal/ready` implementation executes `SELECT 1`; if Flyway fails during startup, the application does not reach the state where that probe can return healthy.
- **Repository delta:** `backend/pom.xml` still does not declare the two Flyway dependencies. This remains an implementation task, not an architecture-coordinate defect.

## Finding

**Low — deployment envelope overstates the failure effect** (`ARCHITECTURE-SPINE.md`, Deployment & Operations Envelope): “migration failure prevents the backend server from starting” is stronger than needed and not the clearest description of Boot's lifecycle. The official lifecycle allows an HTTP server to be in the startup phase while traffic is refused; the guaranteed outcome is failed application startup and no successful readiness response. Suggested wording: “Flyway migration failure fails application startup, so the readiness probe cannot report healthy.” The operative behavior is correct; this is a precision fix.

## Sources

- [Spring Boot 4.1.2 managed dependency coordinates](https://docs.spring.io/spring-boot/appendix/dependency-versions/coordinates.html)
- [Spring Boot database initialization and Flyway](https://docs.spring.io/spring-boot/how-to/data-initialization.html)
- [Spring Boot readiness and HTTP server lifecycle](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html)
- [Flyway PostgreSQL database module](https://documentation.red-gate.com/flyway/reference/database-driver-reference/postgresql-database)
