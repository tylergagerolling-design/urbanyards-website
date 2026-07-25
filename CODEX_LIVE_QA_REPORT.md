# Urban Yards Live QA Report

Audit date: 2026-07-25  
QA batch: `codex-live-audit-2026`  
Production site: `https://urbanyards.us/dashboard`

## Safety checkpoint

- Starting branch: `main`
- Starting local commit: `c35aa8d` (`Add owner ticket stage override`)
- Production build observed at audit start: `6179435`
- Production data policy: preserve all legitimate records; create only records prefixed `TEST – CODEX QA –`; do not send messages, place calls, issue external invoices, process payments, or permanently delete records.
- Files initially awaiting deployment: `dashboard.js`, `dashboard.html`, and `netlify/functions/dashboard-tickets.js` from commit `c35aa8d`.
- Reversal: revert the audit commits. No schema or legitimate production-data deletion is part of this audit.

## Baseline validation

- `npm.cmd run check`: PASS
- `npm.cmd test`: PASS, 206/206 before audit changes
- Production build command: `node scripts/build-dashboard-config.js && npm run check && npm test`
- Static-site repository: no separate compile/bundle command is configured.
- Desktop sweep: all 14 dashboard workspaces loaded with no document-level horizontal overflow.
- Mobile sweep at 390 × 844: no document-level horizontal overflow. Kanban, tabs, maps, and data tables use contained horizontal scrolling where required.
- Console: no application errors observed. One Google Maps performance warning was observed because the Maps script is loaded without `loading=async`.

## Connected fictional workflow

Created:

- Customer/site: `TEST – CODEX QA – Cedar Grove HOA`
- Property: `TEST – CODEX QA – Cedar Grove Commons`
- Intake/service: `TEST – CODEX QA – Seasonal groundskeeping audit`
- Source record: `QT-D1E90`
- Metadata embedded in internal notes: `qa_test: true`; `qa_batch: codex-live-audit-2026`
- Contact values are reserved QA data: `codex-qa@example.com`, `(503) 555-0199`

No call, email, notification, invoice delivery, or payment action was triggered.

## Defect: partial ticket creation was reported as success

Severity: High  
Area: Tickets / unified workflow

### Reproduction

1. Open Tickets and select **New Job Ticket**.
2. Complete the three-step wizard.
3. Submit the ticket.
4. The source quote record is saved, but the unified Job Ticket is unavailable.
5. The drawer and toast previously reported success and continued showing a source-record preview.
6. **Mark Intake Reviewed** updated the source status but did not reliably provide the unified lifecycle controls.

### Root cause

The ticket wizard intentionally creates a legacy-compatible source record first, then attempts to create its canonical `job_tickets` record. `insertJobTicket()` returns `null` when the live Job Ticket table/schema is unavailable. The submit handler treated that partial outcome as full success. Source-record handoff controls had the same silent fallback.

### Repair

- Ticket creation now reports the partial-save condition explicitly instead of claiming the complete ticket was created.
- Source-record tickets now expose Owner override controls.
- Owner override first creates/reuses the unified Job Ticket and only then performs the protected, audited force transition.
- If canonical creation is unavailable, the UI leaves the source record intact and gives a precise migration/retry message.
- Added automated regression coverage.

Repair commit: `cf0459e` (`Fix partial unified ticket creation`)  
Related Owner override commit included in the deployment: `c35aa8d` (`Add owner ticket stage override`)

Production data impact: no legitimate records changed or removed.

## Cleanup

Do not run cleanup blindly. Search for the exact prefix `TEST – CODEX QA –` and batch marker `codex-live-audit-2026`, verify every matched record is fictional, then move those records to the application’s reversible archive/recently-deleted flow. Permanently delete only after a second exact-match review. The audit does not authorize deleting any non-QA record.

## Deployment record

- Local validation after repair: PASS, 207/207 automated tests.
- Push, Netlify deployment confirmation, and deployed live retest: pending.
