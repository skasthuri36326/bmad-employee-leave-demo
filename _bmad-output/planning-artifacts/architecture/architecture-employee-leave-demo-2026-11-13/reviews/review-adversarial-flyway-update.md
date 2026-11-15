# Adversarial Architecture Review — Flyway and Build Coordination

**Verdict:** The spine now closes the readiness and browser/API seams, but it still leaves concrete integration failures possible when backend and local-provisioning work are built independently.

## Findings

### Medium — No shared Flyway version allocation or migration ownership

AD-4 requires versioned SQL files in the same backend migration directory and runs Flyway during startup, but it does not establish who owns migrations or how independently built units allocate versions. For example, an identity/persistence unit can add `V1__create_users.sql` while a leave unit adds `V1__create_leave_requests.sql`. Both follow the stated location and versioning rule; Flyway rejects the duplicate version and backend startup fails, so the required readiness gate never passes. Even distinct versions can fail if a leave migration runs before the identity migration that creates its referenced user table.

**Recommendation:** Assign one migration owner or define a coordinated migration sequence and shared version allocation before parallel implementation. Require each migration to state its prerequisite schema and include cross-unit migrations in the same ordered history.

### Medium — Seed mechanism and migration ordering are unspecified

AD-6 says local Compose provisioning creates the Employee, Manager, and assignment, while AD-4 says Flyway creates schema on backend startup. It does not say which mechanism inserts seed rows or when it runs. A Compose/PostgreSQL init script runs when the database volume is initialized, before the backend starts and applies Flyway migrations; if it inserts into tables that only Flyway creates, a fresh local database fails provisioning. A backend seed runner or Flyway seed migration would have different lifecycle and rerun behavior, and the spine does not require units to choose the same one. This can leave a healthy backend without the demo accounts or make clean-volume startup fail.

**Recommendation:** Name the seed owner and lifecycle relative to Flyway (for example, an idempotent backend seed step after successful migrations), and specify whether it runs on every startup or only when rows are absent. Keep credentials sourced from the ignored local configuration as AD-6 requires.

### Low — Persisted display-name fields are absent from the shared data model

OpenAPI requires `displayName` on `/api/me` and `employeeName` in Manager request representations, but the AD-4 data model lists only user ID, email, password hash, and role. An authentication unit implementing that model can validly omit a name column, while a leave/API unit implementing the response contract needs one; separately choosing to derive a name from email or add a column gives different observable values and possibly a follow-on migration. The API shape is explicit, but the common persisted source and provisioning value are not.

**Recommendation:** Add the display name to the shared user schema and seed contract, or explicitly define a deterministic derivation rule used by both current-user and Manager leave responses.

## Scope

These findings concern build-time and local startup compatibility across independently implemented units. The existing readiness probe ordering, role-scoped API behavior, and atomic decision contract are sufficiently explicit for this review; no further concrete incompatibility was identified there.
