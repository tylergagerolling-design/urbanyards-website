# Urban Yards Backend Security Setup

This pass adds the security foundation for the Urban Yards dashboard without changing the public website design.

## New Backend Routes

- `/.netlify/functions/dashboard-records`
  - Protected dashboard create/update/delete proxy for allowlisted Supabase tables.
  - Requires Supabase Auth bearer token.
  - Checks role permissions, feature flags, rate limits, audit logging, and system error logging.

- `/.netlify/functions/dashboard-export`
  - Owner/admin-only export endpoint.
  - Supports `?table=all&format=json` and single-table CSV exports such as `?table=contacts&format=csv`.

Existing routes now also participate in the security foundation:

- `/.netlify/functions/groundskeeper-ai`
- `/.netlify/functions/quote`
- `/.netlify/functions/find-square-invoices`
- `/.netlify/functions/sync-square-invoice`
- `/.netlify/functions/route-geocode`
- `/.netlify/functions/route-directions`

## Required Netlify Environment Variables

Required for protected dashboard backend routes:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_DASHBOARD_OWNER_EMAIL=team@urbanyards.us
DASHBOARD_OWNER_EMAIL=team@urbanyards.us
DASHBOARD_ADMIN_EMAILS=team@urbanyards.us
APP_ENV=production
```

Recommended:

```env
AI_HELPER_DAILY_LIMIT=80
SUPABASE_FUNCTION_TIMEOUT_MS=10000
```

Feature-specific variables still apply:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
SQUARE_VERSION=2025-06-18
RESEND_API_KEY=
QUOTE_TO_EMAIL=team@urbanyards.us
TURNSTILE_SECRET_KEY=
```

## Supabase SQL

Run this migration in Supabase SQL editor:

```text
supabase/migrations/20260709_security_foundation.sql
```

It creates or improves:

- `profiles`
- `roles`
- `feature_flags`
- `settings`
- `audit_logs`
- `system_errors`
- future canonical tables: `clients`, `properties`, `leads`, `lead_notes`, `appointments`, `equipment`, `equipment_maintenance`, `invoices`, `call_logs`, `ai_sessions`
- RLS policies for existing dashboard tables when present

It also seeds these feature flags:

- `ai_helper_enabled`
- `client_portal_enabled`
- `outreach_enabled`
- `equipment_enabled`
- `scheduler_enabled`
- `square_invoices_enabled`
- `google_voice_calling_enabled`
- `maintenance_mode`
- `csv_import_enabled`
- `beta_features_enabled`

## Role Model

Roles:

- `owner`
- `admin`
- `staff`
- `viewer`
- `client`

The backend never trusts frontend-provided role data. It resolves the user from the Supabase Auth bearer token, then checks `profiles`, `roles`, owner/admin email env vars, and user metadata.

Permissions:

- owner/admin: full access
- staff: operational records such as leads, appointments, equipment, notes, call logs, and routes
- viewer: read-only dashboard records
- client: future client portal own-record access only

## Dashboard Behavior Changes

- Dashboard reads still use the logged-in Supabase session and RLS.
- Dashboard writes now go through `/.netlify/functions/dashboard-records`.
- Tools & Admin now includes `Backend Export`, which downloads an owner/admin protected backend export.
- A subtle environment pill appears only when `APP_ENV`/Netlify context is not production.

## Security Notes

- Supabase service-role key is only read server-side.
- OpenAI and Square keys remain server-side.
- The public AI helper uses `ai_helper_enabled` as a kill switch.
- AI helper has message length limits, per-window rate limits, and a daily in-memory limit.
- Serverless in-memory rate limits are practical but not perfect across multiple Netlify instances. For stricter abuse prevention, add a Supabase-backed rate-limit table later.
- The AI does not directly modify leads, invoices, appointments, or client records. Dashboard action-taking still requires explicit UI actions.

## Manual Backup Options

Dashboard:

- Go to `Tools`.
- Click `Backend Export` for the protected server-side JSON export.

Supabase:

- Use Supabase dashboard table exports for one-off CSV exports.
- For a full database backup, use Supabase project backups or `pg_dump` with a database connection string.

## Test Checklist

1. Run `npm run check`.
2. Run `npm test`.
3. Run the SQL migration in Supabase.
4. Confirm `feature_flags` includes seeded rows.
5. Sign into the dashboard as `team@urbanyards.us`.
6. Create/edit/delete one low-risk dashboard record.
7. Confirm `audit_logs` records the action.
8. Trigger a backend failure in staging/local and confirm `system_errors` records it.
9. Click `Backend Export` in Tools & Admin as owner/admin.
10. Confirm a viewer/staff account cannot access owner/admin export routes.
11. Confirm public quote form still works.
12. Confirm public AI helper still works when `ai_helper_enabled = true`.
13. Set `ai_helper_enabled = false` and confirm the helper fails gracefully.

## Known Limits

- The dashboard still performs read operations from the browser using Supabase anon key and RLS. This is expected and safe when RLS is installed.
- Login still uses Supabase Auth directly. Supabase handles auth protection; the app does not proxy password login through Netlify.
- Persistent rate limiting is not implemented yet. The current helper is serverless in-memory.
- Existing dashboard table schemas vary by feature. The migration locks down existing tables when found and creates canonical future tables without deleting or reshaping existing data.
