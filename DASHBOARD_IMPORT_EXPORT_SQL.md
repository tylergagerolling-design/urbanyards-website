# Dashboard Import / Export SQL

Run this SQL in Supabase to enable the Import & Export Center:

`supabase/migrations/20260710_import_export_google_sheets.sql`

That migration is the full copy/paste SQL for this feature. It includes:

- `import_batches`
- `import_rows`
- `import_changes`
- `import_mappings`
- `export_jobs`
- `backup_history`
- `google_connections`
- `sheet_connections`
- `sync_runs`
- `sync_conflicts`
- contact workbook fields on `contacts`
- `lead_activity` call history support
- indexes
- RLS policies
- feature flags

If Supabase SQL Editor does not let you upload/open the file directly, open the migration file in this repo and paste the entire contents into Supabase SQL Editor.
