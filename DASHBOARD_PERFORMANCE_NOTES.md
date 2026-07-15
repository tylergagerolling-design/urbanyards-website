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
