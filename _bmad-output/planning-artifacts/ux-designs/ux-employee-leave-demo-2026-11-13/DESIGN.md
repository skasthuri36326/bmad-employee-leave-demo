---
name: Employee Leave Demo
status: final
sources:
  - "{project-root}/_bmad-output/planning-artifacts/prds/prd-employee-leave-demo-2026-11-13/prd.md"
updated: 2026-11-13
description: A clear, restrained interface for submitting and reviewing employee leave requests.
colors:
  canvas: '#F5F7FA'
  surface: '#FFFFFF'
  text: '#17212F'
  muted: '#596579'
  border: '#6B7280'
  primary: '#2856A3'
  primary-foreground: '#FFFFFF'
  focus: '#174EA6'
  pending: '#6B3F00'
  pending-surface: '#FFF3CD'
  approved: '#14532D'
  approved-surface: '#E4F4EA'
  rejected: '#8A1C13'
  rejected-surface: '#FEE4E2'
typography:
  body:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.35'
  heading:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 28px
    fontWeight: '650'
    lineHeight: '1.2'
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '6': 24px
  '8': 32px
  content-max: 1120px
components:
  primary-button:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
  status-pending:
    foreground: '{colors.pending}'
    background: '{colors.pending-surface}'
    radius: '{rounded.full}'
  status-approved:
    foreground: '{colors.approved}'
    background: '{colors.approved-surface}'
    radius: '{rounded.full}'
  status-rejected:
    foreground: '{colors.rejected}'
    background: '{colors.rejected-surface}'
    radius: '{rounded.full}'
  focus-ring:
    color: '{colors.focus}'
  request-row:
    border: '{colors.border}'
    radius: '{rounded.md}'
  decision-dialog:
    background: '{colors.surface}'
    radius: '{rounded.lg}'
---

# Employee Leave Demo — Design Spine

> Provisional visual tokens for the first build. The user supplied no brand guide or existing design system, so these defaults are assumptions and can be replaced without changing the behavioral contract in `EXPERIENCE.md`.

## Brand & Style

The interface should feel like a practical workplace tool: calm, readable, and direct. It helps people complete a leave task and understand its state without decorative friction. These are provisional design choices for the first build, not established organizational branding.

## Colors

- **Canvas** `{colors.canvas}` separates the application frame from content.
- **Surface** `{colors.surface}` holds forms and request lists.
- **Text** `{colors.text}` carries primary content; **muted** `{colors.muted}` is for supporting labels and dates.
- **Primary** `{colors.primary}` marks the main action and active navigation. Its foreground is `{colors.primary-foreground}`.
- **Pending**, **approved**, and **rejected** colors distinguish status badges. Every badge also displays its exact text label; color never communicates status by itself.
- **Focus** `{colors.focus}` is used for a visible keyboard focus indicator.
- Meet WCAG 2.2 AA contrast: at least 4.5:1 for normal text and 3:1 for large text, meaningful control boundaries, and focus indicators against adjacent colors. Verify default, hover, and disabled states before implementation.
- Use `{colors.border}` for visible field and panel boundaries: it has 4.83:1 contrast against white surfaces and 4.50:1 against `{colors.canvas}`. Decorative dividers may use spacing and grouping as additional cues.
- The provisional token pairs are: primary text on white, 7.12:1; muted text on white, 5.90:1; Pending `{colors.pending}` on `{colors.pending-surface}`, 8.11:1; Approved `{colors.approved}` on `{colors.approved-surface}`, 7.99:1; Rejected `{colors.rejected}` on `{colors.rejected-surface}`, 7.72:1; focus ring `{colors.focus}` against white, 7.85:1. Recheck if any token changes.

## Typography

Use a platform sans-serif stack for predictable rendering. Body content uses `{typography.body}`; field labels use `{typography.label}`; page titles use `{typography.heading}`. Keep dates, reasons, and status labels legible without requiring zoom.

## Layout & Spacing

Use the spacing tokens for consistent gaps. On wide screens, center the page content up to `{spacing.content-max}`. Use a compact shared application header with the signed-in role and a clear sign-out action. Keep dashboard content in a single primary column; request tables may use the available width on desktop. On narrow screens, convert rows into stacked request cards and keep actions visible without horizontal scrolling.

## Elevation & Depth

Use borders and surface contrast as the primary grouping cues. Reserve a subtle shadow for a dialog if one is used; do not stack elevated cards inside other cards.

## Shapes

Use `{rounded.sm}` for compact inputs, `{rounded.md}` for buttons and content panels, and `{rounded.lg}` only for dialogs or larger containers. Status indicators use a pill shape while preserving their text label.

## Components

| Component | Visual specification |
|---|---|
| Sign-in form | One shared form accepts either seeded account. Use persistent credential labels on a white surface, visible field borders, and visible focus ring `{components.focus-ring}`. Keep errors associated with the field. |
| Request form | Same field treatment as Sign-in form; date inputs and the “Reason for requesting leave” field align in a single column, with the primary action after the fields. |
| Employee request list | Use aligned desktop rows with `{components.request-row}` boundaries; on phone, show labeled request cards. |
| Manager review list | Use aligned desktop rows with `{components.request-row}` boundaries; on phone, show labeled request cards and keep the review action within each card. |
| Decision controls | Use visible text labels “Approve” and “Reject”; distinguish the actions by hierarchy and placement as well as color. |
| Decision confirmation | `{components.decision-dialog}` presents the selected outcome and clear confirm/cancel actions. Use only for the provisional confirmation behavior in `EXPERIENCE.md`. |
| Status badge | Use the corresponding `{components.status-pending}`, `{components.status-approved}`, or `{components.status-rejected}` foreground/background pair and show the exact status text. |
| Primary button | `{components.primary-button}` for the dominant action, such as “Request leave” or “Submit request.” |

## Do's and Don'ts

| Do | Don't |
|---|---|
| Keep role, request status, and next action easy to scan. | Use color alone to convey status or errors. |
| Preserve text labels and visible keyboard focus. | Hide important actions on hover only. |
| Use the same status wording across both role dashboards. | Add an Admin navigation item or dashboard in this build. |
| Reflow request rows on narrow screens. | Require horizontal scrolling to read a request or choose an action. |
| Treat this palette as provisional until brand guidance exists. | Present provisional tokens as approved brand standards. |
| Verify text and focus contrast against the stated WCAG targets. | Ship status badge colors without checking foreground and background together. |

## Product Terms

Use the Employee, Manager, Leave request, Assignment, Status, and Demo account definitions in [`EXPERIENCE.md` Glossary](EXPERIENCE.md#glossary) as the shared product vocabulary.
