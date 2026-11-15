# Final Technology Check — Flyway

**Artifact:** `ARCHITECTURE-SPINE.md`  
**Verdict:** **Pass.** The current Flyway dependency and readiness wording is accurate for the declared Spring Boot 4.1.2 stack.

## Checks

- The dependency names are correct: `org.springframework.boot:spring-boot-starter-flyway` and `org.flywaydb:flyway-database-postgresql`. Spring Boot 4.1.2 manages the starter at 4.1.2 and the PostgreSQL module at Flyway 12.4.0. The existing Maven parent is `spring-boot-starter-parent` 4.1.2, so leaving versions off these dependencies is consistent with Boot dependency management.
- `backend/src/main/resources/db/migration` is the correct Maven source path for Boot's default `classpath:db/migration` location.
- The updated deployment statement is accurate: Boot runs Flyway as part of application startup, and a migration error fails startup. Boot readiness remains refusing traffic until startup tasks finish, so the internal readiness probe cannot report healthy on a failed startup. The repository probe's `SELECT 1` is adequate after Boot has completed migration startup.
- The backend POM has not yet added either Flyway dependency. This is an implementation delta; the architecture instruction itself is verified.

## Sources

- [Spring Boot managed dependency coordinates](https://docs.spring.io/spring-boot/appendix/dependency-versions/coordinates.html)
- [Spring Boot database initialization and Flyway](https://docs.spring.io/spring-boot/how-to/data-initialization.html)
- [Spring Boot readiness lifecycle](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html)
