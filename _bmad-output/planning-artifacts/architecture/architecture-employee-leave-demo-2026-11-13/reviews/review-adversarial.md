# Adversarial Architecture Review

**Verdict:** The spine and OpenAPI substantially close the core frontend/backend seams. I found two medium integration gaps that could still yield incompatible local Compose builds; the authorization and state mutation boundaries are otherwise explicit enough to prevent the main divergent implementations.

## Findings

### Medium — OpenAPI response shape requires the owner's name for every caller

`LeaveRequest` requires both `employeeId` and `employeeName` for every response, including the Employee's own request list and create response. The UX only calls for showing the Employee's own dates, reason, and status; it does not require the Employee API to receive identity fields. A backend could follow the PRD and omit these fields on Employee-scoped responses, while the frontend generated from OpenAPI treats them as mandatory. Conversely, always returning them increases exposed identity data without a documented Employee need.

**Recommendation:** Define role-specific response schemas (for example, `EmployeeLeaveRequest` and `ManagerLeaveRequest`) or make employee identity fields optional in the shared schema and require `employeeName` only in the Manager response schema. Keep the Manager list/review name requirement explicit.

### Medium — Compose readiness references health without a health contract

The Deployment & Operations Envelope requires frontend readiness to wait for backend health and backend readiness to wait for PostgreSQL health, but neither the API contract nor the spine defines a backend health/readiness probe, and the database probe convention is unspecified. Separate implementers could choose different endpoints or Compose dependency conditions, resulting in startup loops or a frontend marked ready while the API is unavailable.

**Recommendation:** Specify local-only readiness probes and their semantics in the spine (for example, an internal Spring Boot readiness endpoint and PostgreSQL's `pg_isready`), and require Compose `service_healthy` dependencies. Do not expose operational endpoints through the browser proxy.

## Checks that held

- The browser cannot set role, request owner, manager, or initial status; Spring derives identity and scope from the authenticated session and persisted assignment.
- Employee list and detail access are owner-scoped; Manager list, detail, and decision access are assignment-scoped; out-of-scope request lookups avoid protected data.
- Decisions carry only `APPROVED` or `REJECTED`; the single Pending-to-terminal transition and `409` stale-decision response prevent competing mutation semantics.
- CSRF token acquisition and POST header usage are aligned across the API and proxy rules.
- Inclusive calendar dates, the local demo timezone, and trimmed reason limits are made explicit.
- No additional architecture divergence was found in the role-specific dashboards, session handling, demo seed scope, or explicit exclusions.
