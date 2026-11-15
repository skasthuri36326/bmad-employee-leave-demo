# Technology Verification Review — Flyway Update

**Artifact:** `ARCHITECTURE-SPINE.md`  
**Lens:** Verify named technologies, current official documentation, and repository reality for the Flyway update.  
**Verdict:** **Pass — no blocking findings.**

## Findings

None. The Flyway choices and lifecycle claims in AD-4 agree with current Spring Boot 4.1.2 and Flyway documentation:

- **Spring Boot starter:** `org.springframework.boot:spring-boot-starter-flyway` is a published Spring Boot 4.1.2 starter. The official dependency coordinates list it with version 4.1.2. Spring Boot's database initialization guide says the starter supports migration auto-configuration.
- **PostgreSQL module:** `org.flywaydb:flyway-database-postgresql` is the correct database-specific Flyway module. Spring Boot explicitly gives this coordinate as the PostgreSQL example; Flyway documentation identifies PostgreSQL support as a separate Java dependency. Boot 4.1.2's managed-coordinate list specifies Flyway 12.4.0 for this module.
- **Version management:** Using the Boot parent/BOM without explicit versions for the starter and database module is consistent with Boot's dependency management. The existing `backend/pom.xml` already uses `spring-boot-starter-parent` 4.1.2, so the stated management mechanism matches the repository's build setup.
- **Migration path:** `backend/src/main/resources/db/migration` is correct. Spring Boot documents the default classpath location as `classpath:db/migration`; Maven's resources layout puts `src/main/resources` on that classpath. Flyway's own docs also list `classpath:db/migration` as the API default.
- **Startup/readiness:** Spring Boot runs database initialization during application startup as part of application-context refresh. Its readiness state changes to accepting traffic only after startup work has completed. Therefore the spine's statement that migrations run during startup before backend readiness is sound, provided the readiness probe uses Boot's readiness state (or equivalent gating) and the application does not override the lifecycle. A failed migration is fail-fast under the documented auto-configuration, preventing normal successful startup/readiness.

## Repository reality

The current `backend/pom.xml` has the Boot 4.1.2 parent and PostgreSQL JDBC driver, but does not yet declare either Flyway dependency. This is an implementation delta, not a contradiction in the architecture spine: AD-4 describes what the backend must include. Add both dependencies without versions when implementing the spine.

## Sources

- [Spring Boot 4.1.2 database initialization](https://docs.spring.io/spring-boot/how-to/data-initialization.html)
- [Spring Boot managed dependency coordinates](https://docs.spring.io/spring-boot/appendix/dependency-versions/coordinates.html)
- [Spring Boot dependency versions](https://docs.spring.io/spring-boot/appendix/dependency-versions/)
- [Spring Boot application readiness](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html)
- [Flyway PostgreSQL database module](https://documentation.red-gate.com/flyway/reference/database-driver-reference/postgresql-database)
- [Flyway locations and defaults](https://documentation.red-gate.com/flyway/reference/configuration/flyway-namespace/flyway-locations-setting)
