# Adversarial Review — Story 2 Alignment

**Verdict:** The revised spine closes the earlier migration-ordering, startup-readiness, and display-name gaps, and its explicit seed-after-readiness constraint keeps seed operations off the default application startup path. Three implementation seams remain where independently built units can still disagree while claiming to follow AD-3, AD-4, and AD-6.

## Findings

### Medium — AD-3 specifies the response order but not a reproducible Spring Security mechanism

AD-3 requires unauthenticated session-protected POSTs to return 401 before CSRF is evaluated, while login is CSRF-protected without requiring an authenticated session. The browser contract repeats these outcomes. However, the spine does not define how the filter chain distinguishes an absent/expired session from a valid session before invoking CSRF validation, or how login is exempted from the authentication gate while remaining subject to CSRF. Spring Security's normal filter ordering does not automatically mean an authentication entry point is evaluated before CSRF for every POST. One team could customize a filter/authorization chain to produce 401 first; another could retain normal CSRF-first processing and produce 403 for an unauthenticated request missing a token. Both may assert that CSRF protection is enabled and that authentication is required.

**Recommendation:** State the exact route-level policy and require a single Spring Security configuration that enforces it (including login's CSRF-only exception). Treat the specified status precedence as an integration acceptance condition for every protected POST, not merely logout and leave creation.

### Medium — AD-6 does not establish the backend password-verification contract or password source handling

AD-6 specifies PostgreSQL `crypt(password, gen_salt('bf', 10))` and storing only hashes. It does not say that Spring Boot must verify submitted credentials against those values using BCrypt-compatible verification, nor define how the seed SQL obtains the plaintext demo passwords without embedding them in the SQL file. A backend unit can use a different `PasswordEncoder` (or expect a distinct hash format), making the generated accounts impossible to authenticate despite successful seed execution. Independently, a developer could place literal passwords in the externally mounted SQL file, while another expects environment interpolation or another input mechanism; the rule that demo credentials remain in that file does not distinguish the password from the resulting hash and does not constrain SQL interpolation/logging behavior.

**Recommendation:** Name the backend verifier as BCrypt-compatible with the specified PostgreSQL `bf` hashes and cost, and define a safe input mechanism for seed plaintext values (for example, Compose-provided secret values consumed without SQL statement echo). Explicitly require that seed SQL, psql output, and service logs never emit those values.

### Low — The `pgcrypto` prerequisite has no owner in the ordered migration/seed contract

AD-4 requires migrations to order prerequisites before dependents, and AD-6 says seeding fails if the hashing function is missing. Neither requires a migration to install/enable `pgcrypto` or identifies another provisioning owner. A backend migration author can omit it, expecting an operator to enable the extension; the seed-service author can assume the function exists after PostgreSQL health and backend readiness. That deployment passes readiness but deterministically fails at seed time on a fresh volume.

**Recommendation:** Require the shared Flyway history to make `pgcrypto` available before the seed job runs (or identify one explicit, ordered owner for extension provisioning). Keep the current fail-fast behavior when installation is unavailable.

## Rechecked / resolved

- **Migration and readiness ordering:** AD-4 assigns one Flyway history, disallows competing schema initialization, and runs migrations before readiness. The deployment envelope's `/internal/ready` check performs `SELECT 1`, while successful application startup gates it behind Flyway. AD-6 and the envelope both require PostgreSQL and backend health before seed execution. This resolves the previous clean-volume race, assuming the stated ready probe remains gated by successful application startup.
- **Compose default startup:** The default stack explicitly excludes the one-shot seed service; AD-6 requires explicit invocation. Builders still need to document the chosen invocation in operational instructions, but the architecture does not permit implicit provisioning during ordinary startup.
- **Seed atomicity:** `ON_ERROR_STOP` plus one SQL transaction and no default seed values makes failures atomic. Rerun/idempotency semantics are not fixed; this is not a concrete cross-unit contradiction for the stated one-time demo provisioning flow.

## Scope

This review assesses whether separate implementation units can satisfy the current architecture prose yet disagree at integration boundaries. It does not modify the spine.
