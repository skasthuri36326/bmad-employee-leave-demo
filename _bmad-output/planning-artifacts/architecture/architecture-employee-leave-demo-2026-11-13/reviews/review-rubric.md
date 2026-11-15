# Architecture Spine Rubric Review

**Verdict:** The spine covers the main first-pass boundaries, security responsibilities, data ownership, and local deployment envelope. It is close to usable as a build contract; resolve one assumption label and one shared contract shape before marking it final.

## Findings

### Medium — Local date timezone is an inferred decision, not a settled requirement

AD-7 fixes the local demo's date validation timezone to `Europe/London`, while the PRD only says the start date must be today or later. The timezone is recorded as an assumption in the memlog but appears as an adopted invariant in the spine. Mark this part of AD-7 as `[ASSUMPTION]` or confirm it in the product source before implementation.

### Medium — Manager display name is not actually guaranteed by the shared request schema

The UX requires the Manager dashboard/review to display the Employee name. The OpenAPI `LeaveRequest.employeeName` property is optional because it is absent from the schema's `required` list. Although this is a contract detail, it leaves an integration divergence the spine's AD-5 is meant to prevent. Require it for responses (or define a Manager-specific response schema) and ensure the create response can satisfy that shape.

## Checklist

- **Decision coverage:** Good. The spine fixes identity/authorization ownership, proxy behavior, CSRF, shared persistence, API payload boundaries, seed scope, date/reason rules, and keyboard behavior.
- **Rule enforceability:** AD-1 through AD-8 are actionable. The atomic Pending-only decision rule is stated and matches the PRD's stale/conflicting decision behavior.
- **Capability coverage:** FR-1 through FR-7 and both primary journeys are mapped. No Admin, registration, rejection reason, notification, or production-deployment capability was added.
- **Structural seed:** The dependency flow, entity relationships, source layout, and Compose topology are sufficient for a cold start without prescribing application code.
- **Operational envelope:** Local Compose services, health ordering, ports, volume, and secret handling are covered; production operations are explicitly excluded.
- **Deferred items:** Migration tooling and pagination can wait for implementation; neither permits conflicting application boundaries in this first build.

## Disposition

Autofix the assumption marker and response schema requirement before finalizing. No blocker was found in the spine's access-control model or scope boundary.
