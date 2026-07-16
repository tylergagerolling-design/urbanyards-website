# Dashboard Performance Notes

## 2026-07-15 - avatar and tab body startup delay

Root cause:
- The authenticated dashboard waited for `loadCurrentUserProfile()` before starting the main dashboard data refresh.
- The selected tab body was not rendered until the full `loadDashboardData()` module bundle completed.
- The avatar also waited for the full dashboard render even though the user-profile request often finished earlier.

Fix:
- `showApp()` now renders the dashboard shell immediately after auth/session resolution, then starts the full data refresh.
- `loadUserProfiles()` now updates the shared profile cache and renders the sidebar/header avatar as soon as profile data arrives.
- No extra Supabase request was added; the existing user-profile module result is reused.

Files changed:
- `dashboard.js`

Measured behavior:
- Before: initial tab body and uploaded avatar were gated behind the full dashboard refresh.
- After: the app shell and active tab can paint from the current/default state immediately, and the avatar updates independently when profile data returns.

Still worth watching:
- Optional heavy modules can still affect their own sections. Keep active-tab data fetches isolated as the rebuild continues.

## 2026-07-15 - shared dashboard loader held by optional modules

Root cause:
- `refreshDashboard()` set the global status to `Loading dashboard records...` and awaited the full `loadDashboardData()` bundle before clearing it.
- That bundle loaded 23 modules together, including support modules that are not required for the first visible screen: Groundskeeper AI, Documentation, Import & Export, job budgets, audit logs, user profiles, equipment, route planner support, and outreach lists.
- Several modules also fanned out into multiple unpaginated `select=*` calls, so one slow optional table or backend function could keep the whole dashboard behind a shared loader.

Fix:
- Added module-level timing instrumentation with phase, duration, record count, success/failure/timeout, and whether the module is essential for first paint.
- Split dashboard loading into an initial active-view phase and a background support-module phase.
- The dashboard shell and active page render first; support modules refresh afterward and can fail locally without blocking the whole app.
- Added per-module timeouts: 12 seconds for initial/essential modules and 20 seconds for background modules.
- Added explicit limits to broad startup reads for quotes, contacts, jobs, notes, reminders, documents, route stops, outreach records, equipment, documentation, and budget line-item tables.
- Dashboard diagnostics now include recent module timings and the slowest measured module.

Files changed:
- `dashboard.js`
- `DASHBOARD_PERFORMANCE_NOTES.md`

Measured behavior:
- Before: the whole authenticated dashboard could stay in the shared `Loading dashboard records...` state until every module finished, including optional support modules.
- After: the shell renders immediately from current/default state, the active workflow modules load first, and optional support modules continue in the background.

Remaining attention:
- Production Supabase timings should be reviewed from the new diagnostics after the next slow load.
- The remaining broad reads should eventually be converted to per-page pagination/search instead of fixed first-page limits.

## 2026-07-16 - rebuilt primary pages still rendered hidden legacy bodies

Root cause:
- The six primary rebuild pages were mounted above legacy tab bodies, and CSS made the rebuilt workspace the visible source of truth.
- `render()` still refreshed the hidden legacy bodies for Home, Work, Leads, Money, and Tools on every active-tab render.
- That created unnecessary DOM churn and made the rebuilt pages easier to confuse with older layouts during debugging.

Fix:
- Primary routes now render only their rebuilt workspace: Home, Tickets, Work, Leads, Money, and Tools.
- Legacy/support modules still render when opened directly through their support routes, including Contacts, Documentation, Equipment, Route Planner, Groundskeeper AI, and Import/Export.

Files changed:
- `dashboard.js`
- `DASHBOARD_PERFORMANCE_NOTES.md`

Expected behavior:
- The dashboard should feel cleaner and more deterministic after the shell loads because each primary tab has one active body.
- Hidden legacy panels no longer do render work for primary tabs.

Still worth watching:
- Actions that still depend on legacy support modules should either open their support route or be replaced with rebuilt ticket-first actions as each workflow slice is completed.

## 2026-07-16 - per-workspace loading, partial, and retry state

Root cause:
- After the global loader was removed from startup, individual pages could still feel ambiguous while their own data hydrated.
- A slow or partially failed page needed a local status and retry path instead of falling back to a shared dashboard warning.

Fix:
- Added a compact data-state strip to the six rebuilt primary workspaces: Home, Tickets, Work, Leads, Money, and Tools.
- Each workspace now shows `ready`, `loading`, `synced`, `partial`, or `failed` state based on its own hydration record.
- Partial and failed states expose a local `Retry` action that reloads only that workspace's required modules.
- Hydration now triggers a lightweight rerender when a page starts loading so the local state is visible immediately.

Files changed:
- `dashboard.js`
- `dashboard.css`
- `DASHBOARD_PERFORMANCE_NOTES.md`

Expected behavior:
- The shell remains usable while page data hydrates.
- Users can tell which page is loading or partially unavailable without opening Diagnostics first.
- Retrying a page no longer refreshes every dashboard module.

## 2026-07-16 - active-tab data contracts trimmed

Root cause:
- Background auto-loading had been disabled, but several primary tabs still treated support-heavy data as required active-page data.
- Work required route planner, documentation, and ticket-event modules before the Work page could finish hydrating.
- Leads required companies, properties, contacts, and lead activity even though the rebuilt lead page can paint from prospects and tickets first.
- Money required budgets on first hydrate even though budget records are optional while the ticket-centered rebuild is being finished.
- Tools attempted to request no startup modules, but the loader interpreted an explicit empty list as "load every module."

Fix:
- The six primary workspace contracts now load only their minimum visible data first.
- Tools has an explicit zero-module startup contract and no longer expands that into a full dashboard refresh.
- Optional support modules still load when their dedicated support routes are opened.

Files changed:
- `dashboard.js`

Expected behavior:
- Home, Tickets, Work, Leads, Money, and Tools should become usable without waiting on Documentation, Groundskeeper AI, route planner, full user profiles, audit logs, or other support tables.
- A slow support table should produce a local warning only when that support module is opened, not during the main dashboard startup path.

## 2026-07-16 - avatar hydration uses dedicated user endpoint first

Root cause:
- The sidebar/header avatar could still wait on several direct `profiles` table guesses before trying the protected dashboard user endpoint.
- If a profile table read was slow or unavailable, the uploaded avatar path could arrive later than necessary.

Fix:
- `loadCurrentUserProfile()` now tries the protected `dashboard-users` `me` action first.
- Direct profile table reads remain as a fallback for incomplete installs.

Files changed:
- `dashboard.js`

Expected behavior:
- The dashboard still renders a fallback avatar immediately from the auth session.
- Uploaded avatars and profile display names should hydrate through a single purpose-built request before falling back to slower profile-table probes.
