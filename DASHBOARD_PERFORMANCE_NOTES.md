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
