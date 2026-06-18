# Urban Yards Owner Dashboard Setup

The owner dashboard is available at `/dashboard`. It is intentionally not linked from public navigation or the footer.

Right now the dashboard uses mock/sample data and a temporary browser-session login gate. It does not hardcode a password. Real protection should be added through Supabase Auth before storing private customer records.

## Supabase values

When the Supabase project is ready, paste the project values in `dashboard-config.js`:

```js
window.URBAN_YARDS_DASHBOARD_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
  ownerEmail: "team@urbanyards.us"
};
```

Keep `ownerEmail` set to `team@urbanyards.us` unless the authorized dashboard email changes.

## Auth plan

- Do not enable public sign-up for the dashboard.
- Create or invite only the owner account: `team@urbanyards.us`.
- Replace the mock login in `dashboard.js` inside `signInOwner()` with `supabase.auth.signInWithPassword()`.
- After sign-in, reject any authenticated user whose email is not `team@urbanyards.us`.
- Use Supabase row level security so only the authorized owner account can read or update dashboard records.

## Planned tables

The dashboard script is already structured around these future tables:

- `quote_submissions`
- `contacts`
- `scheduled_jobs`
- `job_notes`
- `follow_up_reminders`

The loading hook is `loadDashboardData()` in `dashboard.js`. Replace the mock data returned there with Supabase table queries when the database is ready.

## Current dashboard sections

- Quote/contact submissions
- Contact list
- Scheduled jobs/visits
- Job notes
- Follow-up reminders
- Status fields: New, Contacted, Scheduled, Completed, Invoiced
