---
title: Simple Employee Leave Application
status: final
created: 2026-11-13
updated: 2026-11-13
---

# PRD: Simple Employee Leave Application

## 0. Document Purpose

This PRD defines the first-pass behavior and acceptance criteria for an internal demo application that lets one seeded Employee request leave and one seeded Manager decide requests assigned to them. It is intended for product, UX, architecture, and implementation planning. Functional requirements are grouped by capability and numbered for downstream reference. Assumptions and unresolved decisions are identified explicitly.

## 1. Vision

The application demonstrates a clear leave-request workflow for two roles: an Employee submits a dated request with a reason and tracks its outcome; a Manager reviews only requests from employees assigned to them and records an approval or rejection. Both roles can understand the current state of a request without relying on email or manual status updates.

The first pass is deliberately small: access is limited to two seeded demo accounts, decision authority follows manager-to-employee assignment, and the application provides no rejection rationale. The core product promise is that each role sees the right requests and that the backend enforces that boundary on every relevant operation.

## 2. Target Users

### 2.1 Jobs to Be Done

- **Employee:** When I need time away, I want to submit the dates and explain why, then check whether my request is pending, approved, or rejected.
- **Manager:** When employees assigned to me request leave, I want to review each request and approve or reject it so the employee can see the decision.

### 2.2 Non-Users (v1)

- Public visitors who want to create an account.
- Administrators who manage users, assignments, or application settings.
- Managers seeking requests from employees assigned to another manager.

### 2.3 Key User Journeys

- **UJ-1. An Employee requests leave and checks the decision.**
  - **Persona + context:** Alex, the seeded Employee, needs time away and wants a simple way to request and track it.
  - **Entry state:** Alex opens the login screen and signs in with the Employee demo account.
  - **Path:** Alex lands on the Employee dashboard; chooses to request leave; enters a start date, end date, and reason; submits; then returns to the dashboard to find the request.
  - **Climax:** The submitted request appears with Pending status, confirming it was recorded.
  - **Resolution:** Alex can revisit the request and see its updated status as Pending, Approved, or Rejected. No rejection reason is shown.
  - **Edge case:** If a required field is missing, the trimmed reason is empty or exceeds 500 characters, the start date is before today, or the end date precedes the start date, the application explains the validation problem and does not create the request.

- **UJ-2. A Manager decides an assigned employee's request.**
  - **Persona + context:** Morgan, the seeded Manager, needs to review leave requests from employees assigned to Morgan.
  - **Entry state:** Morgan signs in with the Manager demo account and lands on the Manager dashboard.
  - **Path:** Morgan reviews the visible request list; opens a request to inspect its dates and reason; chooses Approve or Reject; confirms the decision if prompted; returns to the list.
  - **Climax:** The request displays the recorded Approved or Rejected status.
  - **Resolution:** The Employee can see the same resulting status on their own dashboard. Morgan cannot enter a rejection reason.
  - **Edge case:** A request outside Morgan's assignments is not returned in the list and cannot be read or decided through a direct request.

## 3. Glossary

- **Employee** — A seeded user who submits leave requests and views only their own requests.
- **Manager** — A seeded user who views and decides requests belonging to Employees assigned to them.
- **Leave request** — A record containing an Employee, leave start date, leave end date, reason, status, and submission information.
- **Assignment** — The relationship that identifies which Manager is responsible for an Employee.
- **Status** — The state of a leave request: Pending, Approved, or Rejected.
- **Demo account** — One of the two preconfigured accounts used to access the application; accounts cannot be created through public registration.

## 4. Features

### 4.1 Sign-in and Role-Specific Access

**Description:** The application presents a login screen for the two seeded demo accounts. After successful authentication, the Employee sees the Employee dashboard and the Manager sees the Manager dashboard. Public account registration is unavailable. The server determines the authenticated role and applies permissions on every data operation; a client-selected role or hidden/visible control does not grant authority.

**Functional Requirements:**

#### FR-1: Sign in to a seeded Demo account

A person with valid credentials for a seeded Demo account can sign in and reach the dashboard associated with that account's role.

**Acceptance criteria:**
- The login screen accepts the credentials of the seeded Employee and seeded Manager accounts.
- A successful Employee sign-in opens the Employee dashboard; a successful Manager sign-in opens the Manager dashboard.
- Invalid credentials do not create an authenticated session and produce a clear sign-in error.
- The authenticated identity and role used for authorization come from trusted server-side authentication state, not a role value supplied by the client.
- Demo credentials are seeded from local configuration outside the repository and supplied to the evaluator through local demo setup; credential secrets are not committed to the repository.
- Passwords are stored and verified as password hashes; plaintext passwords are not stored.

#### FR-2: Prevent public registration

An unauthenticated visitor cannot create a Demo account through the application.

**Acceptance criteria:**
- No public registration flow is available in the UI.
- Requests to any account-creation operation available to the application are rejected unless performed through an authorized out-of-band seeding mechanism.

#### FR-3: Enforce role-based access on the backend

The backend authorizes each request using the authenticated account's role and identity, regardless of frontend presentation.

**Acceptance criteria:**
- An Employee cannot access Manager-only request lists or decision operations by calling backend operations directly.
- A Manager cannot use backend operations to retrieve or change data outside the Manager's assignments.
- An unauthenticated request to protected leave-request data or decision operations is rejected.
- Changing client-side role or identity values does not change the backend authorization result.

### 4.2 Employee Leave Requests

**Description:** The Employee can submit a request with leave dates and a reason, then review their own request history and each request's Status. This realizes UJ-1.

**Functional Requirements:**

#### FR-4: Submit a leave request

An authenticated Employee can submit a Leave request containing a start date, end date, and reason for requesting leave.

**Acceptance criteria:**
- Start date, end date, and reason are required to submit.
- The start date must be today or later; the end date must be the same as or later than the start date.
- The date range includes both start and end dates, and every date in the range counts as one calendar day. Same-day leave is valid. Weekends and public holidays are treated as ordinary calendar days; no weekend or public-holiday rules are applied.
- The reason is trimmed before validation and storage. After trimming, it must contain 1–500 characters; whitespace-only input is invalid.
- A valid submission creates one Leave request associated with the authenticated Employee and initializes its Status to Pending.
- The Employee receives confirmation that the request was submitted and can find it in their request list.
- Invalid submissions create no Leave request and identify the field, reason, or date-range problem.

#### FR-5: View own leave requests and statuses

An Employee can view their own Leave requests and each request's dates, reason, and Status.

**Acceptance criteria:**
- The Employee's list includes their Pending, Approved, and Rejected requests.
- The Employee cannot retrieve another Employee's request, including through a direct backend request or by changing an identifier.
- When a Manager changes a request's Status, the Employee sees that updated Status on their next request-list view.
- Rejected requests do not expose a rejection reason because the first pass does not collect one.

### 4.3 Manager Review and Decision

**Description:** The Manager sees requests from assigned Employees and can approve or reject a Pending request. The backend checks the Assignment relationship for list, detail, and decision operations. This realizes UJ-2.

**Functional Requirements:**

#### FR-6: View requests from assigned Employees

An authenticated Manager can view Leave requests only for Employees assigned to that Manager.

**Acceptance criteria:**
- The Manager's request list includes requests from assigned Employees and excludes requests from all other Employees.
- The backend applies this restriction to operations that list or retrieve individual requests.
- Attempting to retrieve an unassigned Employee's request by identifier is rejected without disclosing its request details.

#### FR-7: Approve or reject a pending request

An authenticated Manager can set a Pending Leave request belonging to an assigned Employee to Approved or Rejected.

**Acceptance criteria:**
- Approve records Approved; Reject records Rejected.
- The backend verifies both the Manager role and the Assignment relationship before changing Status.
- A Manager cannot decide a request belonging to an Employee who is not assigned to them, including by directly invoking the backend operation.
- A Manager cannot enter or submit a rejection reason; the first pass records only the Rejected Status.
- A decision is visible to the Employee who owns the request when they next view their request list.
- Repeated or conflicting decisions against a request that is no longer Pending are rejected and do not silently overwrite its recorded decision.

## 5. Cross-Cutting Requirements

### 5.1 Security and Privacy

- Backend authorization is mandatory for every protected read and write. Frontend control visibility is not an authorization boundary.
- Employees can access only their own Leave requests. Managers can access and decide only requests within their Assignments.
- The application must not reveal the contents of an unauthorized Leave request in an error response.
- Demo credentials are seeded locally from configuration stored outside the repository. Do not commit credential secrets. Store and verify password hashes; do not store plaintext passwords.

### 5.2 Usability and Accessibility

- Login errors and form validation errors are presented in text associated with the relevant action or field.
- Status is represented with the exact labels Pending, Approved, and Rejected; color alone must not convey Status.
- Every interactive control is reachable and operable by keyboard. The login, request submission, review, and decision flows can be completed without a pointer.
- Keyboard focus is visible and follows the logical order of reading and interaction.
- After a Manager successfully approves or rejects a request, focus moves predictably to that request's updated Status in the current view.

## 6. Non-Goals (Explicit)

- Public registration or self-service account recovery.
- An Admin role or user/assignment management interface.
- Keycloak or any specifically mandated identity provider.
- Notifications, including email, push, or in-app notifications.
- Rejection reasons or a manager comment field.
- Production deployment or production operations.
- Leave balance calculations, policies, calendars, conflicts, or approval chains beyond the single Manager decision.

## 7. MVP Scope

### 7.1 In Scope

- One seeded Employee Demo account and one seeded Manager Demo account.
- Login and role-appropriate dashboards.
- Employee request submission with dates and reason.
- Employee access to their own requests and Pending, Approved, or Rejected Status.
- Manager access to requests from assigned Employees and approve/reject actions.
- Backend enforcement for role, ownership, and Assignment boundaries.
- Form validation and clear feedback for invalid requests and unauthorized operations.

### 7.2 Out of Scope for MVP

- Registration, Admin workflows, Keycloak, notifications, and production deployment, as explicitly excluded by the requester.
- Rejection rationale, since the Manager does not enter one and the Employee does not see one in this pass.
- Multiple approval steps, leave balances, policy enforcement, team calendars, attachments, editing or cancelling a submitted request, and reporting. Submitted request details cannot be edited or cancelled in this first pass.
- User and Assignment management screens; the two demo accounts and their Assignment relationship are seeded outside the user-facing flow.

## 8. Success Measures

- **SM-1:** In a demo walkthrough, an Employee can submit a valid request, find it as Pending, and later see its Approved or Rejected Status. Validates FR-4 and FR-5.
- **SM-2:** In a demo walkthrough, the Manager can decide an assigned Employee's Pending request and the Employee can see the outcome. Validates FR-6 and FR-7.
- **SM-3:** Authorization checks confirm that an Employee cannot read another Employee's request and a Manager cannot list, retrieve, or decide a request outside their Assignments. Validates FR-3, FR-5, FR-6, and FR-7.

**Counter-measure:** Do not count a hidden frontend control as evidence that access is restricted. Success requires backend authorization checks for direct requests as stated in FR-3, FR-5, FR-6, and FR-7.

## 9. Open Questions

None for the first-pass scope. Request editing and cancellation are explicitly out of scope (§7.2).

## 10. Assumptions Index

- §1: The application is an internal demo rather than a production leave-management service.
- §1 and §2.3: The product is a web application with separate role-specific dashboards.
- §4.3 FR-7: A decision is allowed only while the request is Pending; a subsequent request to change the decision is rejected.
- §7.1: The seeded Manager is assigned to the seeded Employee, so the demo can exercise the review journey.
- §7.2: Employee and Assignment data are provisioned outside the user-facing application flow.
