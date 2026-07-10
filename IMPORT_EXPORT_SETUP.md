# Urban Yards Import, Export & Google Sheets Setup

The Import & Export Center lives in the owner dashboard at `#import-export`.
Supabase remains the source of truth. The browser talks only to the protected Netlify Function:

`/.netlify/functions/dashboard-import-export`

## What It Supports

- CSV and Excel import preview with field mapping, validation, duplicate detection, and confirm step.
- CSV, Excel, PDF, and JSON exports.
- Full JSON dashboard backup.
- Import/export history.
- Import rollback for records that were created by an import batch.
- Google Sheets OAuth connection and export-to-sheet workflow.
- Round-trip Excel contact workbooks for contacts, prospects, properties without contacts, and follow-up call lists.
- Completed Call List workbook imports that update contacts and create call history entries.

## Required SQL

Run the SQL migration in Supabase:

`supabase/migrations/20260710_import_export_google_sheets.sql`

That file creates the import/export history tables, Google Sheets connection metadata tables, sync run tables, indexes, RLS policies, and feature flags.
It also extends `contacts` with the round-trip workbook fields and creates/updates `lead_activity` for call outcome history.

## Round-Trip Contact Workbooks

Use Dashboard -> Import & Export -> Export Data -> Round-Trip Contact Workbooks.

Available workbook downloads:

- Blank Contact Template
- Current Contacts
- Current Prospects
- Properties Without Contacts
- Follow-Up Call List
- All Outreach Records

Each workbook is a real `.xlsx` file with instruction, contact, call list, company/property, allowed values, and hidden metadata sheets where relevant.
Phone cells are formatted as text. The importer validates phone values and normalizes valid numbers for call buttons.

To upload a completed workbook:

1. Go to Import Data.
2. Pick `Contacts` for contact/profile rows or `Call List` for call outcome rows.
3. Upload the completed workbook.
4. Review column mapping, phone validity, duplicates, rejected rows, and updates.
5. Confirm only when the preview looks right.

Call List imports can create `lead_activity` rows when a row includes a call outcome, call notes, or next follow-up date. Calls still use the browser/Google Voice workflow; the dashboard does not embed or automate Google Voice.

## Netlify Environment Variables

Add these in Netlify under Project configuration -> Environment variables:

```env
DASHBOARD_IMPORT_MAX_BYTES=5242880
DASHBOARD_IMPORT_MAX_ROWS=2000
DASHBOARD_IMPORT_ROLLBACK_DAYS=30
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URL=https://urbanyards.us/.netlify/functions/dashboard-import-export?action=google-callback
GOOGLE_TOKEN_ENCRYPTION_KEY=
```

`GOOGLE_TOKEN_ENCRYPTION_KEY` should be a long random value. It is used server-side only to encrypt Google refresh tokens before storing them in Supabase.

## Google Cloud OAuth Setup

1. Create or open a Google Cloud project.
2. Enable the Google Sheets API.
3. Configure OAuth consent for the Urban Yards owner/admin account.
4. Create an OAuth client ID for a web application.
5. Add this authorized redirect URI:

`https://urbanyards.us/.netlify/functions/dashboard-import-export?action=google-callback`

6. Copy the client ID and client secret into Netlify.

## Security Notes

- Do not put Google client secrets, Supabase service role keys, or token encryption keys in frontend JavaScript.
- Google OAuth tokens are stored encrypted in Supabase and are only used from the Netlify Function.
- Public website visitors cannot access the dashboard import/export endpoint unless they have dashboard auth and permissions.
- Imports are previewed before saving. Rows with invalid required fields are rejected instead of partially inserted.
- Completed contact/call workbooks are revalidated server-side before saving, even after the browser preview.
- CSV exports prefix spreadsheet formulas with a single quote to reduce formula-injection risk.

## Operational Limits

Defaults:

- Max import file size: 5 MB
- Max import rows: 2,000
- Rollback retention: 30 days

These can be adjusted with the Netlify environment variables above.

## Current Google Sheets Behavior

The first implementation supports connecting Google Sheets and exporting a selected dashboard module into a new spreadsheet.
Two-way sync metadata and conflict tables are included so future sync work can be added without changing the schema again.
