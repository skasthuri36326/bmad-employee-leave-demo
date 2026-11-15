---
id: 6
type: story
title: "Integrate frontend and backend and verify journeys"
parent: epic-employee-leave-first-build
covers: [R1, R2, R3, R4, R5, R6, R7]
after: [5]
refined: false
hitl: false
risk: high
---

# Integrate frontend and backend and verify journeys

## Description

The shared login, Employee journey, Manager decision, and negative authorization paths work end to end through the same-origin proxy.

## Requirements

1. **Complete the Employee journey end to end** (R1, R2, R3)
   **Given** the local Compose stack and Employee demo credentials are ready
   **When** the Employee signs in, submits valid leave, and returns to the dashboard
   **Then** the shared login selects the Employee dashboard and the owned request appears as Pending with its dates and reason
   **And** invalid dates or reason are rejected without creating a request

2. **Complete the Manager and Employee decision journey** (R1, R4, R5)
   **Given** the Employee has a Pending request and the assigned Manager credentials are available
   **When** the Manager signs in and approves or rejects the request
   **Then** the Manager sees only assigned requests and the selected status is saved once
   **And** the Employee later sees Approved or Rejected without a rejection reason
   **And** keyboard focus and the status announcement meet the UX contract

3. **Verify authorization through browser and direct API paths** (R6)
   **Given** anonymous, Employee, and Manager sessions plus test-only owner and assignment fixtures are available (the demo seed remains one Employee and one Manager)
   **When** the same-origin proxy and Spring Boot API are called with missing sessions, altered browser IDs, cross-owner IDs, and unassigned Manager IDs
   **Then** each call receives the specified 401, 403, or non-disclosing 404 and returns no unauthorized request data
   **And** UI control visibility is not counted as evidence of backend authorization

4. **Verify responsive and keyboard journeys** (R1–R5)
   **Given** the Employee and Manager flows are available at desktop and phone viewport widths
   **When** a keyboard-only user completes login, request submission, review, and decision
   **Then** request data reflows into labeled phone cards without horizontal page scrolling
   **And** focus remains visible and logical and moves to the updated decision Status

5. **Verify the contract and local run path** (R7)
   **Given** the integrated application is running
   **When** the OpenAPI contract and Compose service health are checked
   **Then** implemented operation request/response shapes and status codes match the contract
   **And** frontend, backend, and database health dependencies work without exposing backend or database ports to the browser

## References

- parent — _bmad-output/initiative-employee-leave-demo/tickets/epic-employee-leave-first-build/epic-employee-leave-first-build.md
- prd — _bmad-output/planning-artifacts/prds/prd-employee-leave-demo-2026-11-13/prd.md, UJ-1, UJ-2, SM-1 through SM-3, and Counter-measure
- architecture — _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/ARCHITECTURE-SPINE.md, AD-1 through AD-8 and Deployment & Operations Envelope
- api contract — _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml
- experience — _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/EXPERIENCE.md, Key Flows, State Patterns, and Accessibility Floor
- design — _bmad-output/planning-artifacts/ux-designs/ux-employee-leave-demo-2026-11-13/DESIGN.md, responsive behavior and status/focus styling

## Boundaries

- Must not change: verification covers only the local two-role first pass; no Admin, registration, notifications, rejection rationale, or production deployment.
- Must not change: assertions prove Spring Boot authorization through direct API calls, not only frontend behavior.
- Must not change: alternate owners and assignments exist only in isolated test fixtures; the local demo seed remains one Employee and one Manager.

## Notes

- Risk: high — a gap between frontend proxy behavior and direct backend behavior could make a successful walkthrough misleading. Extra check: after logout and signing in as the other role, verify that no cached data from the prior account flashes during dashboard loading.
