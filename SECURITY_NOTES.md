# Urban Yards Dashboard Security Notes

The dashboard is treated as an authenticated internal operations app.

## Roles

Supported dashboard roles are `owner`, `admin`, `manager`, `worker`, and `viewer`. The legacy `staff` role is mapped to manager-level access for compatibility.

- `owner` and `admin`: full dashboard access, user management, exports, settings, and sensitive backend actions.
- `manager`: broad operational access for leads, clients, jobs, routes, equipment, notes, and read access to invoices.
- `worker`: field-work access for schedules, routes, notes, calls, and equipment. Assigned-record policies can be tightened further as assigned-user columns are added.
- `viewer`: read-only dashboard access.

## Secrets

Private keys must stay server-side in Netlify environment variables. The browser must never receive OpenAI, Square, Google, or Supabase service-role keys.

Sensitive operations route through Netlify Functions:

- AI helper and Groundskeeper training
- Supabase service-role mutations
- User invitations and role changes
- Exports/backups
- Avatar storage operations
- Square and Google server-side calls

## Row Level Security

The Supabase migrations enable RLS on dashboard business tables. Owner/admin policies allow full access. Manager policies allow operational access. Worker/viewer policies are intentionally narrower.

Frontend hiding is not a security boundary. Backend functions verify the Supabase Auth token, resolve the actor role, and check permissions before privileged work.

## Audit Log

Important admin and backend actions should write to `audit_logs`, including user invites, role changes, disable/enable actions, exports, protected mutations, avatar updates, and AI actions.

## Uploads

Avatar uploads are validated on the server for extension, MIME type, size, and magic bytes. SVG, HTML, PDF, scripts, and unknown formats are rejected.

