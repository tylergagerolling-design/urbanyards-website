# Dashboard QA — September 8, 2026

This pass builds on the Money and unified-ticket improvements. These checks were completed locally before the production release requested on September 8, 2026.

## Issues fixed

| Issue | Fix and verification |
| --- | --- |
| Home cards and schedule rows overlapped on phones. | A shared action-button rule was overriding the layout of entire record cards. Excluded those cards, restored wrapping grid layouts, and removed a fixed width from the attention metric. |
| Ticket numbers collided with long status labels on phones. | Date headings now span the group, and ticket number, time, status, and crew information have their own rows. |
| Small Tools and Call Queue controls clipped their labels. | Tabs wrap and action labels can grow vertically. |
| Work's date selector did not filter jobs. | This Week uses Monday–Sunday bounds. All Dates includes historical and unscheduled jobs. Summary counts follow the chosen range; empty results explain how to broaden it. |
| Work rows inserted unescaped customer/property text into HTML. Zero-task jobs produced invalid progress values. | Escaped record values and attributes, protected related ticket filter/menu values, and bounded progress between zero and 100%. Regression tests include HTML-like input and zero tasks. |
| Notes reported success in demo mode without retaining the record. The ticket did not display saved notes. | Demo saves update the shared note collection. Work and the ticket display the same notes, with multiline text preserved. |
| Failed note saves left the button disabled. | A shared submit handler restores the button, retains unsaved text, prevents duplicate submits, and refreshes the note list after success. Empty database responses are treated as failures. |
| Status banners blocked Back after saving a ticket. | The banner background allows clicks through; interactive Undo controls remain clickable. Verified through ordinary browser clicks without forcing them. |
| Leads and Call Queue search lost focus after each debounced render. | Preserve focus and selection when the originating input is still active. Apply the same behavior to related ticket and import searches, without stealing focus from another control. |
| Advanced Tools collapsed whenever a tab changed. | Preserve the open panel when rerendering its content. All five tabs can be used consecutively. |
| Some QA visit times displayed impossible values such as 14:00 AM. | Sample visit windows now use correct 12-hour AM/PM formatting. |

## Results

- **336 automated tests pass**, including eight new regression tests for the defects above.
- `npm run check` passes JavaScript syntax, dashboard layout/action guardrails, and rebuild checks.
- **55 layout checks:** 11 dashboard routes at 1920, 1280, 768, 390, and 320 pixels. No detected clipped controls, horizontal page overflow, or JavaScript runtime errors.
- **Work/ticket interactions:** date filtering, row menus, shared notes, ticket editing, cancel, and Back to Work at 1920, 768, 390, and 320 pixels.
- **Search and Tools:** Leads, Call Queue, and Clients search at 1280 and 390 pixels; all advanced Tools tabs remain usable after switching.
- Rechecked the quote, approval, revision, invoice, payment, expense, and Money navigation workflows from the previous pass.

Browser checks used local demo/showcase records with external requests blocked. Failure/retry behavior used mocked responses. Live login, storage uploads, payment processing, third-party delivery, and production network latency were not exercised. Weather and map unavailability appeared as fallback states under these test conditions.

## Evidence

The following evidence files remain in the local workspace under `artifacts/`; they are not included in the website deployment.

- [Layout report](../artifacts/dashboard-qa/after-sweep.json)
- [Ticket interaction report](../artifacts/dashboard-qa/interactions.json)
- [Search and Tools report](../artifacts/dashboard-qa/after-search-tools.json)
- [Phone Home after fixes](../artifacts/dashboard-qa/after-390-overview.png)
- [Phone Tickets after fixes](../artifacts/dashboard-qa/after-390-tickets.png)
- [Shared notes on a phone](../artifacts/dashboard-qa/notes-390.png)
- [Regression tests](../test/dashboard-qa-regressions.test.js)

The QA checklist and asset cache versions were updated with this pass.
