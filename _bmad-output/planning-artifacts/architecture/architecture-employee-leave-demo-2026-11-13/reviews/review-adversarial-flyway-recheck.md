# Adversarial Architecture Re-review — Flyway Coordination

**Verdict:** The updated spine resolves the prior Flyway ownership/version-ordering and pre-migration seed hazards. One concrete data-contract mismatch remains from the earlier architecture review.

## Rechecked findings

### Resolved — Flyway migration ownership and ordering

AD-4 now makes Flyway the sole schema-change mechanism, assigns the backend one ordered history, requires unique increasing versions, and orders prerequisites before dependent migrations. This prevents independently built identity and leave units from both contributing a duplicate version or running a dependent migration before its tables exist, provided their changes are integrated into that shared history.

### Resolved — Seed runs after schema migrations

AD-6 now requires provisioning only after PostgreSQL is healthy and backend readiness confirms startup migrations succeeded, and explicitly forbids PostgreSQL initialization scripts that run before Flyway. A clean-volume seed can therefore target the migrated schema. The exact seed mechanism and rerun/idempotence behavior remain implementation details, but they do not produce a concrete incompatibility under the stated required outcome (one Employee, one Manager, their assignment).

## Remaining finding

### Low — Persisted display names remain absent from the shared data model

The OpenAPI contract requires `displayName` from `/api/me` and `employeeName` in Manager leave-request responses. The AD-4 data model still lists only user ID, email, password hash, and role, and the initial seed is specified only by role/count/assignment. An independently implemented authentication persistence unit can therefore follow the listed model without storing a display name, while the leave/API unit must supply one for its required response. They must make an undocumented choice (derive a name from email, add a column/migration, or use a fixed value), so separate implementations can return different names or require uncoordinated schema changes.

**Recommendation:** Add a display-name field and seed value to the shared persisted model, or define a single deterministic derivation rule for both response fields.

## Scope

No other concrete incompatibility was found in the revised migration, seed ordering, readiness, or API contracts.
