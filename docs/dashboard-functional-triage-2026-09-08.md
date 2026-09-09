# Dashboard functional triage — September 8, 2026

This was a light functional triage of every current dashboard area, with representative actions and a signed-in production read-through. It was not an exhaustive test of every permission combination or third-party transaction.

## Findings fixed

| Area | Defect | Fix |
| --- | --- | --- |
| Route Planner | The default 60-minute duration failed native validation because the input combined `min=1` with `step=5`, preventing Save Stop. | Allow whole-minute values; verified creation with the default duration. |
| Navigation | Opening Route Planner from Tools could leave a blank workspace when the data was already loaded or demo hydration was skipped. | Render the route workspace immediately when it becomes active. |
| Call Queue | All and Completed filters worked internally but the dropdown reverted visually to Active. | Preserve the selected value across rerenders. |
| Call Queue settings | The form saved browser values but never read or applied them. | Restore settings when opened, apply valid status/source defaults to manually added entries, and apply phone display formatting. Handle unavailable storage without reporting false success. Remove the inactive duplicate-policy and archive controls; import duplicates remain reviewed in the existing import workflow. |
| Call Queue details | Address, source, and last-contact text could be interpreted as markup. | Escape record text and preserve the explicitly constructed safe website link. |
| Dates | UTC date keys made Today and relative-date defaults advance during the Pacific evening. | Use the business's Pacific calendar date, including across year boundaries. |
| Weather | Missing high temperatures and rain readings appeared as real zero values. | Show an em dash for unknown values while preserving actual zero readings. |
| Documentation / Import & Export | The first loading render falsely claimed a loading failure or missing database tables. | Distinguish initial loading from a failed request. |
| Money | Next invoice page stayed enabled at the end of the list, including an empty list. | Disable Next on the last page. |

## Coverage

- 42 desktop feature checks and 41 phone feature checks passed with local sample data: eleven routes; Home navigation; desktop notifications; ticket wizard validation, navigation, creation, and Trash view; client creation, CSV download and detail tabs; Call Queue filters, notes, follow-ups, settings/defaults, and entry creation; lead-to-ticket handoff; route navigation and stop creation; all six Documentation tabs; all four Import & Export views and JSON backup; six Tools destinations.
- Rechecked quote creation, approval, revision, invoice editing, payment recording, and expense creation in one ticket at five widths. Rechecked Work/ticket notes, edits, cancel, menus, and navigation at four widths, plus search focus and advanced Tools tabs.
- A signed-in production session successfully loaded Home, Tickets, Work, Leads, Clients, all three Money tabs, Tools, Route Planner, Documentation, Import & Export, and Call Queue. NWS forecasts and alerts loaded. No JavaScript warnings or errors were reported during that read-through.
- Added regression tests for valid route defaults, settings validation and formatting, escaped contact text, Pacific date boundaries, unknown weather values, and import loading/failure states.
- `npm run check` and all 344 tests passed. The suite was also run with a configured Gemini key sentinel to match the relevant hosting condition.

Production checks were read-only. Record creation and changes used local sample data with external requests blocked. Actual payment processing, sending customer communications, Google Voice calls, storage uploads, Google Sheets sync, and destructive administration were not executed against live services. Their success cannot be inferred from this triage. CSV import validation has automated coverage; no live CSV import was committed.

Local evidence: `artifacts/dashboard-qa/triage-features-report.json`, `triage-mobile-report.json`, `triage-tests.txt`, `triage-money-workflow.json`, `triage-work-interactions.json`, and `triage-search-and-tools.json`.

Release asset version: `20260908-functional-triage-1`.
