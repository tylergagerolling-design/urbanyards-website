# Pre-reset Urban Yards dashboard archive

## Restore point

- Branch: `backup/pre-dashboard-blank-reset-20260803`
- Commit: `35b5dc08fa3fd20b928fde40019686e0ab316eba`
- Scope: the complete frontend immediately before the blank-canvas reset

The previous dashboard was implemented primarily as one monolithic `dashboard.js` file rather than as independently importable page components. The complete retired runtime and route markup are archived here as `dashboard.pre-reset.js` and `dashboard.pre-reset.html`; neither file is referenced by the active application. The backup branch provides a second restore path.

## Retired page components in the restore branch

- Home command center, metrics, queues, reminders, and notes
- Unified ticket directory, ticket workbench, lifecycle, forms, closeout, and detail UI
- Ticket Kanban and assignment boards
- Work scheduling, route, field packet, task, photo, and activity UI
- Leads pipeline, intake, call queue, company, property, and outreach UI
- Money quote, invoice, payment, expense, report, and financial-record UI
- Clients, Equipment, Documentation, Route Planner, Import & Export, Tools, Groundskeeper AI management, and AI Memory page bodies

## Active reset implementation

The active route renderer mounts only a small route-name development label in an otherwise blank canvas. The persistent Groundskeeper assistant is rendered separately and remains active.

No database schema, migration, stored record, environment variable, API function, authentication flow, Supabase connection, drawer markup, or assistant implementation is archived or removed.

## Restore options

Review the archived files here or restore the pre-reset frontend from `backup/pre-dashboard-blank-reset-20260803`. The branch points to commit `35b5dc08fa3fd20b928fde40019686e0ab316eba` and is intentionally kept separate from the active blank-canvas implementation.
