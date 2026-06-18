# Urban Yards Backend Setup

The website now uses serverless endpoints for quote delivery, the assistant, health checks, and lead export. A quote is only shown as received after at least one configured delivery channel succeeds.

## Recommended Production Setup

1. Deploy the repository to Netlify.
2. Copy the variables from `.env.example` into Netlify environment variables.
3. Configure Resend with `urbanyards.us`, then set `RESEND_API_KEY`. Quote emails default to `team@urbanyards.us` as the recipient and `quotes@urbanyards.us` as the sender unless `QUOTE_TO_EMAIL` or `QUOTE_FROM_EMAIL` is set.
4. Create an Airtable table named `Quote Requests` with these fields: `Request ID`, `Received At`, `Name`, `Email`, `Phone`, `Location`, `Service`, `Timeline`, `Message`, `Source`, and `Photos` (attachment field).
5. Set `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_NAME`, and a long random `ADMIN_EXPORT_TOKEN`.
6. Optional: configure Cloudinary server credentials with `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Uploads are signed. Set `CLOUDINARY_DELIVERY_TYPE=authenticated` to keep stored photos private; the email delivery path will attach copies directly instead of publishing links.
7. Optional: configure `MALWARE_SCAN_URL` and `MALWARE_SCAN_TOKEN`. The scanner must accept the documented JSON payload and return `{ "clean": true }`. When enabled, uploads fail closed if scanning is unavailable or detects a problem.
8. Optional: create a Cloudflare Turnstile widget, set `TURNSTILE_SECRET_KEY` in Netlify, and put the public site key in `config.js`.

At least one of Resend, Airtable, or `QUOTE_WEBHOOK_URL` must be configured or the form will clearly report that delivery is unavailable.

## Operations

- Health: `GET /api/health`
- Lead CSV: `GET /api/leads-export` with `Authorization: Bearer YOUR_ADMIN_EXPORT_TOKEN`
- Daily retention removes Airtable leads and Cloudinary quote photos older than `LEAD_RETENTION_DAYS` (180 by default).
- Tests: `npm test`
- Syntax checks: `npm run check`

Server logs use structured JSON events with request IDs, making failed deliveries and assistant errors searchable in Netlify logs.

Outgoing quote and security webhooks include `X-Urban-Yards-Timestamp` and an `X-Urban-Yards-Signature` HMAC (`sha256=...`). Verify the signature against `timestamp + "." + rawRequestBody`, reject timestamps older than five minutes, and use the corresponding webhook secret.

Set `SECURITY_ALERT_WEBHOOK_URL` to receive redacted alerts for rate-limit spikes, delivery outages, unauthorized exports, and retention failures. Alert payloads intentionally exclude customer names, contact details, messages, and photos.

## Analytics

The browser emits these events to `window.dataLayer` and Plausible when available:

- `quote_submit_started`
- `quote_submit_succeeded`
- `quote_submit_failed`

Set `analytics.plausibleDomain` in `config.js` when a Plausible account is ready. No visitor analytics script is loaded by default.
