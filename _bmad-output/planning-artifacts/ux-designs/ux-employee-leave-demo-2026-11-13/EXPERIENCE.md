---
name: Employee Leave Demo
status: final
sources:
  - {project-root}/_bmad-output/planning-artifacts/prds/prd-employee-leave-demo-2026-11-13/prd.md
updated: 2026-11-13
---

# Employee Leave Demo — Experience Spine

> The first build has Employee and Manager experiences only. The PRD's Admin exclusion is confirmed: seed one Employee, one Manager, and their Assignment in demo data; do not provide an Admin journey, dashboard, or user-management surface. These two spines are the contracts; mocks and implementations must follow them.

## Foundation

Responsive web application, with a desktop-primary layout that remains usable on small screens. One shared Sign in screen accepts either seeded account; after authentication, the account's role determines whether the Employee or Manager dashboard opens. Do not ask the person to choose a role at login. No UI library or existing design system was specified. `DESIGN.md` provides provisional visual tokens; behavioral requirements live here. The only roles in the first build are Employee and Manager.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Shared Sign in | Application entry | Authenticate either seeded account through one login form; route to its role-specific dashboard. |
| Employee dashboard | Successful Employee sign-in; app navigation | Start a leave request and view the Employee's own requests and statuses. Visual reference: [`mockups/employee-dashboard.html`](mockups/employee-dashboard.html). |
| Request leave | Employee dashboard action | Enter leave start date, end date, and reason; submit or return without submitting. |
| Manager dashboard | Successful Manager sign-in; app navigation | Review requests from assigned Employees and see their statuses. Visual reference: [`mockups/manager-dashboard.html`](mockups/manager-dashboard.html). |
| Request review | Manager selects a request | Read its dates and reason, then approve or reject a Pending request. |

There is no registration, Admin surface, account-management screen, or Assignment-management screen. Employee and Manager dashboards contain only data authorized for the signed-in account; this must be enforced by the backend as specified in the PRD.

## Voice and Tone

Microcopy is short, neutral, and specific. Keep the same Status labels on both dashboards.

| Situation | Preferred copy | Avoid |
|---|---|---|
| Submit | “Submit request” | “Send it off!” |
| Pending status | “Pending” | “Waiting for approval” as a replacement label |
| Approved status | “Approved” | Vague icon-only confirmation |
| Rejected status | “Rejected” | An implied reason or blame |
| Invalid dates | “End date must be the same as or later than the start date.” | “Invalid input.” |
| Sign-in failure | “Email or password is incorrect.” | Revealing whether a specific account exists |
| Empty Employee list | “You haven’t submitted a leave request.” | A blank table |
| Empty Manager list | “There are no leave requests to review.” | A blank table |
| Unauthorized request | “You can’t access this leave request.” | Showing protected request details in an error |

## Component Patterns

Behavioral rules are defined here. Visual treatment is in `DESIGN.md`.

| Component | Surface | Behavioral rules |
|---|---|---|
| Primary button | Employee dashboard; Request leave | The surface's main action has clear visible text and submits only the displayed operation. |
| Sign-in form | Shared Sign in | One form for the seeded Employee and Manager accounts, with persistent credential labels; submit by button or Enter; invalid credentials leave the user unauthenticated and show a concise error. No role selector or registration link. |
| Request form | Request leave | Required start date, end date, and a field labeled “Reason for requesting leave”; identify required fields in text and programmatically; explain invalid or missing fields inline; keep entered values when validation fails; prevent duplicate submission while saving. |
| Employee request list | Employee dashboard | Use a semantic table with associated headers on desktop; show the Employee's own dates, reason, and Status. On phone, expose each request as a labeled group in reading order (for example, “Leave dates: …”, “Status: Pending”). No other Employee's data is accessible. |
| Manager review list | Manager dashboard | Use a semantic table with associated headers on desktop. Show only requests from assigned Employees, with Employee name, dates, reason preview, Status, and an explicit review action. On phone, expose each request as a labeled group in reading order and keep the review action in that group. |
| Decision controls | Request review | Offer Approve and Reject only while Status is Pending. Do not show or submit a manager rejection-reason field. After a decision, replace decision controls with the recorded Status. |
| Status badge | Both dashboards | Always display the exact text Pending, Approved, or Rejected. Color is supplementary. |
| Decision confirmation | Request review | [ASSUMPTION] Ask the Manager to confirm Approve or Reject in a simple dialog before saving, to reduce accidental decisions. Show the selected outcome in the confirmation text. |

## State Patterns

| State | Surface | Behavior |
|---|---|---|
| Initial load | Protected dashboard | Show a brief loading state; do not flash data from a prior account or role. |
| Empty Employee requests | Employee dashboard | Explain that no request exists and show the primary “Request leave” action. |
| Empty Manager requests | Manager dashboard | Explain that no request is available to review; do not imply the Manager can browse unassigned Employees. |
| Invalid form | Sign in or Request leave | Keep entered values where safe; associate the error with the relevant field and move focus to the first invalid field after submission. |
| Submit in progress | Request leave | Disable repeat submission and indicate progress. On success, show a visible confirmation and return to the Employee dashboard with the new request at Pending. Announce the update as defined in Accessibility Floor. |
| Decision in progress | Request review | Disable both decision actions until the server responds. On success, show the saved Status and remove the decision controls. Apply focus and announcement behavior from Accessibility Floor. |
| Stale decision | Request review | If another action changed the request from Pending, refresh its Status and remove the decision controls; explain that it was already decided and show the refreshed Status. Apply announcement behavior from Accessibility Floor. |
| Permission denied | Any protected request surface | Show a generic access message without request details. Do not treat a hidden control as authorization. |
| Service failure | Any data action | Preserve safe form input, explain that the action did not complete, and provide a retry path. Use announcement behavior from Accessibility Floor. Do not claim success until the server confirms it. |
| Form submission errors | Sign in or Request leave | Identify invalid fields, show a concise error summary or equivalent, and move focus to the first invalid field. Use the error semantics in Accessibility Floor. |

## Interaction Primitives

- The signed-in role is established by the authenticated account. The client cannot switch roles to gain access.
- Successful sign-in routes to the matching role dashboard.
- Sign out is available from the shared application header and returns to Sign in.
- Employee submission creates a Pending request tied to the authenticated Employee; the user cannot choose a different owner or initial Status.
- Manager approval or rejection is a deliberate action on an assigned Employee's Pending request. After confirmation, wait for the backend result before displaying the decision as complete.
- Returning to a dashboard fetches the current request Status. No push, email, or in-app notification is part of this build.
- Do not add keyboard shortcuts; the small number of screens should work with standard keyboard navigation and visible focus.

## Accessibility Floor

- Core flows are usable with keyboard only. Focus order follows the visual and reading order; focus remains visible using `{components.focus-ring}`.
- Every input has a persistent programmatic label. Validation messages are programmatically associated with fields.
- Status, errors, and decisions are conveyed in text, not color alone.
- Buttons and links have descriptive names; action controls are not hover-only.
- Dialogs, including the assumed decision confirmation, receive focus when opened, contain focus while open, and return focus to the initiating control when closed.
- Successful submission and decisions are announced through a polite status region; failures requiring correction use an assertive announcement. Keep announcements visible on screen as well.
- Required fields are identified in text and programmatically. Invalid fields expose `aria-invalid` and a programmatic association to their error; submission presents an error summary or equivalent announcement.
- Desktop request lists use semantic tables with associated headers. Phone cards expose each value with its label, in reading order.
- After a decision, focus moves to the updated Status or request heading and the final Status is announced.
- Interactive targets are at least 24 by 24 CSS pixels, with spacing around smaller inline controls. Approve and Reject use visible text in every viewport.
- Text, status badge pairs, control boundaries, and focus indicators meet the contrast targets in `DESIGN.md` across default, hover, and disabled states.
- At narrow widths, request details and actions reflow without requiring horizontal page scrolling.

## Responsive & Platform

| Viewport | Behavior |
|---|---|
| Desktop | Shared header and centered content; Manager request list can use aligned columns for employee, dates, reason, Status, and review action. |
| Narrow tablet | Keep the primary action and Status visible; reduce secondary spacing and allow long reason text to wrap. |
| Phone | Stack request data into labeled cards; retain full-width form controls and clear decision buttons. Avoid a compressed table or horizontal scrolling. |

Responsive web is an assumption from the application context. No native mobile application is included.

## Key Flows

### UJ-1 — An Employee requests leave and checks the decision

**Protagonist:** Alex is the seeded Employee and needs time away.


1. Alex opens Sign in and enters the Employee Demo account credentials.
2. The application authenticates Alex and opens the Employee dashboard, which contains only Alex's Leave requests.
3. Alex selects “Request leave,” enters a start date, end date, and reason, then submits.
4. If a field is missing, the trimmed reason is empty or exceeds 500 characters, the start date is before today, or the end date precedes the start date, the form identifies the problem and keeps Alex's safe inputs. Otherwise the server creates a request owned by Alex with Pending Status. Dates count inclusively as calendar days; weekends and public holidays have no special treatment.
5. The Employee dashboard shows the new request with its dates, reason, and Pending label.
6. After Morgan decides the request, Alex returns to or refreshes the dashboard and sees Approved or Rejected. Rejected has no reason field or explanation.

**Climax:** Alex sees the saved Pending status, then later sees the Manager's recorded outcome from the same request list.

### UJ-2 — A Manager decides an assigned employee's request

**Protagonist:** Morgan is the seeded Manager, assigned to Alex.


1. Morgan signs in and lands on the Manager dashboard.
2. The dashboard lists only requests belonging to Employees assigned to Morgan. With the initial seed data, Alex is the only Employee.
3. Morgan opens a Pending request and reads the leave dates and reason.
4. Morgan chooses Approve or Reject. [ASSUMPTION] A confirmation dialog names the chosen outcome; there is no rejection-reason field.
5. The server verifies Morgan's role, the Assignment, and that the request is still Pending before saving the decision.
6. The review surface shows the saved Status, and the decision controls are removed. Alex can see that Status on the next dashboard visit.

**Climax:** Morgan sees the backend-confirmed decision on the request; an Employee outside Morgan's Assignment is never shown or exposed by direct request.

## Out of Scope

- Admin sign-in, journey, dashboard, user or Assignment management screens.
- Public registration, notifications, rejection explanations, request edits or cancellations, leave balances, and production deployment.
- Multiple Managers or multi-stage approvals in the seeded first build.

Demo setup seeds one Employee, one Manager, and their Assignment outside the user-facing application.

## Glossary

- **Employee** — A seeded user who submits leave requests and views only their own requests.
- **Manager** — A seeded user who views and decides requests belonging to Employees assigned to them.
- **Leave request** — A record containing an Employee, leave start date, leave end date, reason, status, and submission information.
- **Assignment** — The relationship that identifies which Manager is responsible for an Employee.
- **Status** — The state of a leave request: Pending, Approved, or Rejected.
- **Demo account** — One of the two preconfigured accounts used to access the application; accounts cannot be created through public registration.

## Open Questions and Assumptions

- [ASSUMPTION] The application is desktop-primary responsive web; confirm if phone-first behavior is required.
- [ASSUMPTION] A Manager confirms a decision before it is saved. Remove the dialog if the product owner prefers a one-step action.
- The PRD defines the date and reason rules: inclusive calendar days, start today or later, end on or after start, and a trimmed required reason of 1–500 characters. The application timezone for the “today” check remains an architecture assumption.
- Demo credential delivery remains a setup decision and is not shown on the login screen.
- Visual tokens in `DESIGN.md` are provisional because no brand direction or established UI system was supplied.
