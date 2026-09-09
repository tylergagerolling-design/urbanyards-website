# Dashboard visual design review — September 8, 2026

The review covered Home, Tickets, Work, Leads, Clients, Money, Tools, Route Planner, Call Queue, Documentation, Import & Export, and the unified ticket's twelve sections. The polish preserves the existing forest-green palette and serif headings while improving consistency and readability.

## Changes

- Reduced oversized page headings and softened card shadows, borders, and filter backgrounds. Standardized control shapes, primary actions, and selected tabs.
- Reduced the specificity of legacy button resets and action families that were overriding component styles. Simplified repeated ticket selectors and removed inline button color overrides.
- Made Tools use the available width with clear groups and descriptive navigation rows. Simplified empty-state copy and removed implementation details from the successful Documentation status.
- Simplified Client cards. The labeled Add Client form opens on demand and can be dismissed on desktop and phones.
- Kept all three Money tabs visible on phones and preserved the existing stable loading skeleton. Updated its New action to match the other primary buttons.
- Replaced horizontal mobile Work summaries with a grid and presented job records as labeled mobile cards. Narrow filters now have enough room for their full labels.
- Improved ticket section navigation, summary text, quick actions, and card heading space. Quote service descriptions wrap in a multiline field; form values use normal weight. Replaced the ambiguous GV call marker with a phone icon.

## Verification

- `npm run check` passed, including the dashboard layout checks.
- All 338 tests passed, including a run with a configured Gemini key sentinel to exercise the deployment environment condition.
- Main-page browser sweep: 55 combinations of eleven pages and widths 1920, 1280, 768, 390, and 320px. No page overflow, clipped controls, or JavaScript page errors in the final sweep.
- Ticket/form browser sweep: 45 combinations at 1280, 390, and 320px, including all twelve ticket sections, ticket editing, Add Client open/focus/cancel, and the Money New menu. No page overflow, clipped controls, or JavaScript page errors. All three Money tabs were explicitly checked for containment.
- Money loading checks: 45 cases across five widths and loading, loaded, and failed states. Stable headers and no clipped controls.
- Quote creation, approval recording, quote revision, invoice editing, payment recording, and expense creation passed at five widths while retaining the same ticket. These exercised the multiline service field.
- Work filters, row menus, shared notes, ticket editing/cancel, and return navigation passed at four widths. Search focus and five advanced Tools tabs passed at desktop and phone widths.
- Before/after screenshots and browser reports are retained locally under `artifacts/dashboard-qa/` and `artifacts/money-review/`.

Browser checks used local demo/showcase records and blocked external network requests. Weather and map fallbacks in those captures are expected. No live financial records, clients, or tickets were changed by QA. This release changes presentation and form layout; it does not claim backend response-time improvements.

Release asset version: `20260908-design-polish-1`.
