# Urban Yards Dashboard Database Notes

Primary migrations:

- `supabase/migrations/20260709_security_foundation.sql`
- `supabase/migrations/20260709_user_avatars.sql`
- `supabase/migrations/20260709_dashboard_operations_foundation.sql`

## Core Admin Tables

- `profiles`: dashboard profile, role, disabled state, avatar metadata, and login/activity timestamps.
- `roles`: role preassignment by user id or email, useful before an invited user accepts.
- `audit_logs`: protected activity history for admin review.
- `system_errors`: backend function error capture.
- `feature_flags`: on/off switches for optional modules.
- `settings`: internal/public dashboard settings.

## Import Tables

- `import_batches`: CSV/import preview and final import tracking.
- `import_errors`: row-level import validation errors.

## Archive Strategy

The operations foundation migration adds `archived_at`, `archived_by`, `created_by`, and `updated_by` to common business tables where they exist. The preferred pattern is archive/restore instead of permanent delete for business records.

## Avatar Storage

The `user-avatars` Supabase Storage bucket stores files. Database rows store only `avatar_url`, `avatar_path`, and `avatar_updated_at`, never base64 image data.

