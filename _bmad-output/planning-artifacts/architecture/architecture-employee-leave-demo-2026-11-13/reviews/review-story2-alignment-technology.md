# Story 2 Alignment Review — Technology

**Verdict: Pass with one low-severity clarification.** The spine is consistent with Story 1's technology constraints, uses the correct Boot-managed Flyway dependencies, selects PostgreSQL's BCrypt-compatible `pgcrypto` functions in a way that matches Story 2, and its authentication-before-CSRF behavior agrees with the OpenAPI contract.

## Findings

### Low — Make the migration's pgcrypto prerequisite explicit

`ARCHITECTURE-SPINE.md` AD-6 specifies hashing with `crypt(password, gen_salt('bf', 10))` and requires failure if the hashing function is unavailable. Story 2 more explicitly requires its repository migration to make `pgcrypto` available before seeding. The spine's migration language in AD-4 does not name `CREATE EXTENSION pgcrypto` as a migration responsibility. This is a small implementation ambiguity: the seed operation depends on the extension, and provisioning it through a repository-managed migration would preserve the single schema-history rule. Recommend explicitly requiring the migration to enable `pgcrypto` before the seed service runs.

## Checks

- **Story 1 version constraints:** The stack seed retains Next.js 16.4.6, Spring Boot 4.1.2, and PostgreSQL 18.7 exactly. The other lines remain TypeScript 5.x, Node.js 26 LTS, Java 25, Maven 3.9.x wrapper, and Compose v2. No additional technology patch pins or image digests appear in the spine.
- **Flyway dependencies:** AD-4 names `spring-boot-starter-flyway` and `org.flywaydb:flyway-database-postgresql`, and explicitly leaves dependency versions to Spring Boot dependency management. These are the correct Spring Boot 4.x starter and PostgreSQL-specific Flyway module; no version override is called for. [Spring Boot database initialization](https://docs.spring.io/spring-boot/how-to/data-initialization.html), [managed dependency coordinates](https://docs.spring.io/spring-boot/appendix/dependency-versions/coordinates.html).
- **Password-hash compatibility:** PostgreSQL 18 documents `crypt()` and `gen_salt()` as password-hashing functions, with `bf` selecting Blowfish bcrypt and `iter_count` controlling the work factor; 10 is a permitted value. The resulting `$2a$` bcrypt encoding is a format supported by Spring Security's `BCryptPasswordEncoder`. Therefore Story 2's 60-character `$2a$10$` hash requirement and Story 3 verification path are compatible with the spine's exact expression. [PostgreSQL 18 pgcrypto](https://www.postgresql.org/docs/18/pgcrypto.html), [Spring Security BCryptPasswordEncoder](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/crypto/bcrypt/BCryptPasswordEncoder.html).
- **Authentication and CSRF order:** AD-3 distinguishes session-protected POSTs from login: anonymous or invalid sessions return 401 before CSRF evaluation; authenticated requests with invalid/missing CSRF return 403; login needs CSRF but no pre-existing session. This matches the OpenAPI descriptions for login, logout, employee creation, and manager decision. The spine describes required application behavior; Spring Security needs configuration to ensure this outcome because the order is not guaranteed merely by the prose. [OpenAPI contract](../contracts/openapi.yaml), [Spring Security CSRF reference](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html).

## Scope

Reviewed the architecture spine against Story 1, Story 2, the OpenAPI contract, and official Spring Boot, PostgreSQL, and Spring Security documentation. The spine was not modified.
