# Urban Yards Documentation SQL

Run the full Documentation and Forms SQL in Supabase from:

`supabase/migrations/20260710_documentation_forms.sql`

That migration creates:

- Private Supabase Storage buckets: `documentation-templates` and `documentation-submissions`
- Template library tables with version history
- Assignment, submission, attachment, and audit log tables
- RLS policies for owner/admin/manager/worker/viewer access
- The `documentation_enabled` feature flag
- Indexes and update triggers for the dashboard views

After running the SQL, refresh the dashboard and open **Documentation** from the left drawer.

Owner-only template upload/replace actions are protected by the dashboard backend permission map. Secure file upload and signed-download behavior should stay server-side when the storage function layer is expanded.
