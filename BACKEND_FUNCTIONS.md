# Urban Yards Dashboard Backend Functions

Netlify Functions are used for privileged work and private API calls.

## Dashboard Security

- `netlify/functions/lib/dashboard-auth.js`: shared role, permission, Supabase admin, rate-limit, audit, and system-error helpers.
- `netlify/functions/dashboard-records.js`: protected mutation proxy for dashboard table changes.
- `netlify/functions/dashboard-export.js`: protected CSV/JSON export endpoint.
- `netlify/functions/dashboard-users.js`: protected user listing, invite, role change, disable/enable, and per-user activity.
- `netlify/functions/dashboard-activity.js`: protected audit log read endpoint.

## AI

- `netlify/functions/ai-helper.js`: public website AI helper backend.
- `netlify/functions/groundskeeper-ai.js`: shared Groundskeeper AI backend for dashboard and public helper context.

## Avatars

- `netlify/functions/user-upload-avatar.js`: authenticated self avatar upload.
- `netlify/functions/admin-upload-user-avatar.js`: owner/admin avatar upload for any user.
- `netlify/functions/user-delete-avatar.js`: authenticated avatar removal with permission checks.

## Integrations

Square and Google-related functions should keep secrets in Netlify environment variables and should never expose private keys to frontend JavaScript.

