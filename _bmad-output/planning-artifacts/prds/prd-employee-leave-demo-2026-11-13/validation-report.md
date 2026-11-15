# Validation Report — Simple Employee Leave Application

- **PRD:** `_bmad-output/planning-artifacts/prds/prd-employee-leave-demo-2026-11-13/prd.md`
- **Rubric:** `.agents/skills/bmad-prd/assets/prd-validation-checklist.md`
- **Run at:** 2026-11-13T19:15:19Z
- **Grade:** Excellent

## Overall verdict

This is a strong, usable first-pass PRD for a deliberately small internal demo: the workflow, role boundaries, and backend authorization promise are consistent and stated in verifiable terms. It is ready to guide initial story creation, with a few material details still open around date semantics, reason limits, credential handling, and operational expectations; those should be resolved or explicitly deferred before implementation commitments depend on them.

The source reconciliation found no missing original requirements. One internal date-rule contradiction needs resolution; the remaining findings are open validation and accessibility details rather than scope conflicts.

## Dimension verdicts
- Decision-readiness — adequate
- Substance over theater — strong
- Strategic coherence — strong
- Done-ness clarity — adequate
- Scope honesty — strong
- Downstream usability — strong
- Shape fit — strong

## Findings by severity

### Critical (0)
None.

### High (0)
None.

### Medium (3)

**[Decision-readiness] Date rules conflict with the Assumptions Index** (§4.2 FR-4; §9 question 1; §10)
The Assumptions Index says same-day requests are valid and ranges are inclusive, but §9 asks whether dates are inclusive and says only that the end date must not precede the start date. Past dates and weekend/holiday treatment are also undecided.

Fix: Choose the MVP date rule, then move it to a confirmed requirement or keep it as an assumption and remove the contradictory open question. State whether past dates and weekends/holidays are allowed.

**[Decision-readiness] Demo credential handoff is unresolved** (§5.1; §9 question 3)
The PRD says seeded credentials are not public but does not specify how evaluators receive them or how secrets are configured.

Fix: Choose the delivery/configuration approach or assign it as a pre-demo operational task with an owner.

**[Done-ness clarity] Keyboard accessibility lacks a completion condition** (§5.2 Usability and Accessibility)
“The core login, submission, review, and decision flows are usable with keyboard input” does not specify the required keyboard operations or a verifiable completion condition.

Fix: Require completing each named flow without a pointer, with all controls reachable, operable, and visibly focused.

### Low (1)

**[Done-ness clarity] Reason whitespace and length handling are undefined** (§4.2 FR-4; §9 question 2)
A reason is required, but the PRD does not say whether whitespace-only input is empty or what length is accepted.

Fix: Specify minimum and maximum lengths and whitespace handling, or explicitly defer length validation while rejecting whitespace-only input.

## Mechanical notes
- No material glossary drift; terminology remains stable.
- FR-1–FR-7, UJ-1–UJ-2, and SM-1–SM-3 are unique, contiguous, and cross-references resolve.
- The Assumptions Index covers the explicit assumptions; the seeded manager relationship and date behavior are identified.
- Both named journeys include Alex and Morgan with context.
- Required PRD sections are present and appropriate for the demo.

## Reviewer files
- `review-rubric.md`
- `reconcile-source.md`
