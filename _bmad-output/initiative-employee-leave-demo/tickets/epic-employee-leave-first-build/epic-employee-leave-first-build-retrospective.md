---
epic: epic-employee-leave-first-build
date: 2026-11-16
verdict: accepted-with-open-items
criteria: declared
headless: false
---

# Employee leave request and approval workflow — retrospective

## Epic summary

All seven stories are finished (`state: done`): 1.1 Scaffold the local application stack; 1.2 Create schema and seed demo accounts; 1.3 Add session authentication and role lookup; 1.7 Refactor existing project structure; 1.4 Build Employee leave submission and dashboard; 1.5 Build Manager review and decisions; and 1.6 Integrate frontend and backend and verify journeys. The ticket store reports 7/7 done, no pending tickets, and no dependency-order errors (`tickets/tickets.toml`; `tickets.py status epic-employee-leave-first-build`, checked 2026-11-16). The user's requested emphasis—Story 6 fixture lifecycle and cross-story integration—guided the analysis.

The epic file declares Requirements 1–7 and three `Done when` criteria, so the verdict is based on declared criteria. Story 6 depends on Story 5; the ticket tree preserves that dependency. No ticket was unfinished or accepted for retrospective while unfinished.

### Evidence inventory

- Read the epic, `tickets/tickets.toml`, all seven story files, and all seven plans. Plan statuses are `done`.
- Plans 1.1, 1.2, 1.3, 1.4, 1.5, and 1.7 have `baseline_revision: NO_VCS`; under the retrospective range rule they provide no attributable commit or diff ranges. Story 1.6 records baseline `badb736db4f182d9e6e87f4c7d6fc320142d9a50`. Its measured range is `badb736..9caabf77e05cd6302edb1cfc2a89f0c83dfe8bf9` (HEAD at review), one non-merge commit, no merges, and no binary revisions. `git_evidence.py` reported 13 changed paths and 571 insertions / 71 deletions in that commit. The current staged worktree changes were also reviewed as a diff against the Story 6 baseline; they are not represented in that committed-range count.
- The Story 6 range's largest changed test files were `frontend/tests/e2e/manager-decisions.spec.ts` and `frontend/tests/e2e/authorization.spec.ts`; neither grew into a large production class. The scoped diff adds the E2E Compose service, SQL scripts, helper, and integration tests.
- No run-folder artifacts were present in the epic folder. No session logs were present in the ticket-tree evidence available for this review, so session-level process analysis was skipped.
- The initiative has only this epic, so there is no previous epic retrospective to follow through.
- Read the cited architecture sections (AD-1 through AD-8 and Deployment & Operations Envelope), OpenAPI operations for auth and leave requests, UX Experience key flows/accessibility/responsive behavior, UX Design status/focus/responsive styling, and PRD UJ-1/UJ-2, SM-1–SM-3, and the counter-measure.

## Findings

### Aggregate views

- **Architecture delta — no finding in the available scope.** Story 6 adds an isolated one-shot Playwright service to the existing Compose `app` network. The application stack remains separate, only the frontend is published, and the runner reaches Spring Boot by service name; this follows the architecture's same-origin proxy and private-backend boundaries (`compose.e2e.yaml`; Story 6 plan, Code Map and Verification; architecture AD-1/AD-2 and Deployment & Operations Envelope). The six earlier `NO_VCS` plans prevent a full before/after epic architecture comparison.
- **Duplication map — no finding in the available scope.** The test fixture SQL, per-run manifest query, cleanup SQL, and shell lifecycle helper have distinct roles. The browser tests exercise integrated persistence and authorization, while Story 6 explicitly leaves unit and feature coverage to Stories 3–5 (Story 6, Requirements 3–7 and Boundaries). Earlier cross-ticket implementation history cannot be compared because those plans lack baselines.
- **God-class / size growth — no finding in the measured Story 6 scope.** The change volume is concentrated in the decision journey test and authorization test; the current decision spec is 189 lines and the authorization spec is 110 lines. No production class grew in this range (`git_evidence.py` for Story 6; current test files).
- **Pattern divergence — no finding in the measured Story 6 scope.** The helper uses the project's Compose services and `psql`; fixtures use the existing Flyway schema and constraints; API assertions use the OpenAPI Problem Details and status contracts (`scripts/run-local-e2e.sh`; `scripts/e2e/fixtures.sql`; `scripts/e2e/cleanup.sql`; `frontend/tests/e2e/authorization.spec.ts`).
- **Spec-to-implementation reconciliation — one documentation follow-up.** The current Story 6 acceptance criteria and cleanup SQL agree that cleanup selects rows by the run marker and marker-scoped fixture account emails, never by manifest IDs (Story 6, Requirement 2; `scripts/e2e/cleanup.sql:4-20`). The plan's I/O matrix still says rows may be identified by “manifest IDs or run marker” (Story 6 plan, I/O & Edge-Case Matrix). Update that stale sentence for a single consistent record. This does not affect runtime cleanup or the acceptance result.
- **Evidence provenance — one process follow-up.** Six plans have `NO_VCS` baselines, so the retrospective cannot attribute or compare Stories 1.1–1.5 and 1.7 by their individual build ranges. This is a historical evidence limitation, not an observed product defect. Future plans should record valid starting revisions; see Action items.

### Diff-scope review

The adversarial, edge-case, and verification-gap lenses reviewed the Story 6 baseline-to-worktree diff, including the fixture lifecycle and cross-story network boundary. No source-backed finding survived. The adversarial lens rechecked ten candidate concerns (credential/image isolation, seed preservation, failure cleanup, transaction rollback, app lifecycle, port exposure, Compose network, CSRF/session validity, proxy/direct coverage, and account-switch/phone journeys); current source and runtime evidence ruled them out. The Edge-Case Hunter and Verification Gap results were also empty after source verification.

## Behavior verification

Ran the local helper against the separately running, healthy Compose application stack; it did not start or stop application services. Fixture setup committed two run-scoped accounts, one assignment, and one request after backend health. All four Playwright tests passed:

- both seeded roles sign in and out through the proxy with session/CSRF rotation;
- authorization cases pass through both the frontend proxy and direct Spring Boot service, with expected 401/403/404 results and no protected fields;
- Employee validation and saved-request behavior;
- separate approval and rejection journeys, repeat-decision 409 checks, persistence after Manager logout and Employee sign-in, and keyboard journeys at desktop and 390 × 844.

The helper then committed cleanup of six run-scoped requests, one assignment, and two fixture accounts. The separate failure-injection cleanup verifier passed marker-generation failure, transactional fixture-setup failure, runner failure, post-commit manifest failure, and invalid-manifest failure. It confirmed the E2E rows were removed and the seeded two accounts and their assignment remained. The OpenAPI contract defines 409 for a request no longer Pending; the repeat-decision assertion matches it (`contracts/openapi.yaml`, `/api/leave-requests/{requestId}/decision`).

This is local end-to-end verification only; no CI requirement was added. Unit and feature suites owned by Stories 3–5 were not rerun as part of this retrospective. The E2E tests verify their integration across browser, proxy, backend, and database rather than repeating their isolated behavior checks.

## Previous-retro follow-through

There is no previous epic in this initiative and no previous retrospective file, so there were no earlier action items to follow through.

## Action items

1. **Reconcile the Story 6 plan's fixture-cleanup matrix with the implemented selector rule:** state that cleanup always uses the unique run marker and marker-scoped fixture account emails, while manifest IDs are used by tests and are not delete selectors. **Owner:** Story 6 plan maintainer / Product Owner. **Disposition:** proposed documentation follow-up; not applied here. Source: Story 6 plan, I/O & Edge-Case Matrix; Story 6 Requirement 2; `scripts/e2e/cleanup.sql:4-20`.
2. **Require usable build baselines in future story plans:** ensure each plan records a valid starting revision before implementation, or explicitly record the shared-batch range when stories are built together. For this epic, the six `NO_VCS` historical baselines cannot be reconstructed from the plans, so the missing attribution is recorded rather than guessed. **Owner:** BMad build workflow maintainer. **Disposition:** proposed process improvement for future epics. Source: six plans' frontmatter and the evidence-gathering range rule.

## Decision records

No plan decision met the bar for a separate ADR: the Story 6 runner and marker-scoped fixture lifecycle are reversible implementation details already captured in the story and plan. No decision record was proposed or written.

## Acceptance verdict

**Accepted with open items** (`accepted-with-open-items`; criteria declared). All seven tickets are finished, and the available evidence demonstrates the epic's declared journeys, backend authorization, persistence, validation, keyboard/responsive behavior, and local service integration. In particular, the current fixture setup is transactional and run-scoped, cleanup executes after successful and injected failed runs without removing seed rows, and proxy/direct API authorization checks pass. No blocking product or code-review finding remains. Two non-blocking documentation/process items remain proposed in Action items: reconcile the plan's stale cleanup-selector wording and require usable baselines in future plans. No story, plan, ticket, or epic status was changed by this retrospective.

## Open questions

None that materially change the verdict. The two proposed action items can be accepted or declined in follow-up work.
