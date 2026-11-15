## Deferred from: code review of story-add-session-authentication-and-role-lookup-plan (2026-11-15)

- Test-first execution order is not established by the available snapshot. Repository history or a contemporaneous red-phase test log would settle whether acceptance checks were run before feature implementation.

## Deferred from: code review of story-refactor-existing-project-structure-plan (2026-11-15)

- source_plan: `_bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/tickets/story-refactor-existing-project-structure-plan.md`
  summary: Add a direct no-store assertion for authenticated `/api/me` responses.
  evidence: The controller sets `Cache-Control: no-store`, but the existing authentication test checks only status and role; this predates the refactor.
- source_plan: `_bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/tickets/story-refactor-existing-project-structure-plan.md`
  summary: Handle a failed CSRF refresh after successful logout without leaving the placeholder visible.
  evidence: The placeholder reports failure after logout has invalidated the session, although the user can return to sign-in; this behavior predates the refactor.
- source_plan: `_bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/tickets/story-refactor-existing-project-structure-plan.md`
  summary: Derive logout cookie clearing attributes from the configured session cookie settings.
  evidence: Path and SameSite are hard-coded in the clearing cookie; current application settings match, and the behavior predates the refactor.
- source_plan: `_bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/tickets/story-refactor-existing-project-structure-plan.md`
  summary: Avoid hard-coding the default session cookie name in the secure cookie test.
  evidence: The app supports a configured cookie name while the test expects `LEAVESESSION`; the default test configuration passes, and this predates the refactor.
- source_plan: `_bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/tickets/story-refactor-existing-project-structure-plan.md`
  summary: Guard placeholder redirects against stale session-check responses after unmount.
  evidence: The asynchronous 401 and role-mismatch branches can redirect after cleanup; this behavior predates the refactor.
