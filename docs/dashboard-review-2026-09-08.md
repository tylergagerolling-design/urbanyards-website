# Dashboard review — September 8, 2026

The Money workspace and unified job ticket now use more flexible layouts and one current ticket interface. This review records the local implementation and checks prepared for the production release requested on September 8, 2026.

## Findings and changes

| Area | Finding | Improvement |
| --- | --- | --- |
| Money summary | Small figures, cramped controls, and a horizontal strip on phones made financial information difficult to scan. | Responsive summary cards, readable figures, wrapping controls, and larger touch targets. |
| Financial records | Dense tables squeezed descriptions and controls; empty results could be clipped by table positioning rules. | Desktop tables wrap long values. Tablet and phone records use labeled cards. Empty results remain visible. |
| Ticket proportions | Oversized titles and positioned edit buttons crowded property and summary cards. | Smaller wrapping headings, content-sized controls, a bounded property image, and stacked cards at narrower widths. |
| Quote workflow | Opening financial records could lead to a separate, older ticket interface. Quote pricing used a delimiter-based text field. | Quote, Invoice, and Costs & Closeout sections in the current ticket. Editable service, quantity, and price rows; discount, tax, deposit, terms, and customer message fields. |
| Quote continuity | Approval used a general document update that could replace itemized pricing. Revisions reset pricing fields. | Approval updates status only. Revisions retain line items, the discount amount, tax rate inferred from saved amounts, deposit request, and multiline terms. A revision creates a quote record linked to the existing job ticket. |
| Related records | Invoice edits and payments could leave the ticket. Connected-expense shortcuts still targeted an older spreadsheet control. | Invoice saves, payment recording, and connected expenses return to the same ticket. Expenses preselect the job. |
| Activity accuracy | The ticket sidebar showed hard-coded example activity. | Recent Activity displays recorded ticket events or an empty state. |
| Retired interfaces | Unused renderers and retired Equipment/AI templates remained in the delivered dashboard. | Removed 83 unused renderers and the retired templates. Older ticket entry points now resolve to the current unified interface. |
| Response time | Money repeatedly rebuilt record lookups and number formatters; independent loads ran sequentially and a global loading flag blocked other tabs. | Per-render name lookups, one currency formatter, concurrent independent requests, duplicate-request coalescing, and loading state per view. Search retains focus and caret position after updating results. |

Historical business records remain available. Removing obsolete interfaces does not delete quote history, invoices, jobs, or database records. Source archives and shared legacy CSS remain outside this targeted cleanup; this is not a complete rewrite of the dashboard.

## Validation

- `npm run check`: JavaScript syntax, dashboard layout guardrails, action coverage, and rebuild checks.
- `npm test`: 328 tests, including new functional coverage for concurrent Money requests, retries, cached-tab loading, quote revisions, status-only approval, and record lookup reuse.
- Headless Chromium, local demo data: Money invoices, expenses, and payments at 1920, 1440, 1024, 768, 390, and 320 pixels. All 18 combinations had no detected clipped controls or horizontal page overflow.
- Ticket workflow at 1920, 1440, 768, 390, and 320 pixels: create quote, approve, revise with discount/tax/deposit retained, open invoice, edit invoice, record payment, add connected expense, and display completion review. The selected ticket and ticket count remain stable.
- Navigation checks at 1440 and 320 pixels: search focus, visible empty results, invoice-to-ticket navigation, deep-link reload, and Back to Money.
- Home, Tickets, Work, Leads, Money, and Tools render their current interfaces at desktop and phone widths without JavaScript runtime errors after the code removal.
- No JavaScript runtime errors in the browser checks. External requests were blocked; browser saves used demo records only. Production latency and live database writes were not measured.

## Performance measurement

A local Chromium benchmark rendered 500 invoices linked to 100 tickets, forced layout, discarded the warm-up, and reported the median of five samples. Baseline was Git commit `0ba1e3b`.

| Measurement | Before | After |
| --- | ---: | ---: |
| Median Money render and layout | 103.5 ms | 63.2 ms |
| Dashboard JavaScript source | 1,797,199 bytes | 1,655,204 bytes |
| JavaScript compressed with gzip locally | 363,528 bytes | 334,667 bytes |

The latest local rendering result is about 39% faster. Timings vary with machine load; this does not establish a production network or API speedup. Removing 179,151 bytes of obsolete renderer code, plus the new implementation and other edits, reduced the script by about 142 KB overall.

## Review artifacts

These evidence files remain in the local workspace under `artifacts/`; they are not included in the website deployment.

- [Desktop Money screenshot](../artifacts/money-review/after-1440-invoicing.png)
- [Phone Money screenshot](../artifacts/money-review/after-390-invoicing.png)
- [Phone quote screenshot](../artifacts/money-review/quote-390.png)
- [Layout results](../artifacts/money-review/after-report.json)
- [Ticket workflow results](../artifacts/money-review/workflow-report.json)
- [Navigation results](../artifacts/money-review/navigation-report.json)
- [Removed renderer inventory](../artifacts/money-review/removed-renderers.json)

The local QA scripts and screenshots are under `artifacts/money-review/`. Asset version strings in `dashboard.html` were updated so a future deployment refreshes cached JavaScript and layout CSS.
