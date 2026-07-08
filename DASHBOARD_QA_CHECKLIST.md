# Urban Yards Dashboard QA Checklist

Use this checklist before pushing dashboard changes live.

## Access and Security
- Login works with Supabase Auth.
- Demo mode works and does not touch live Supabase, Square, maps, or AI services.
- Frontend files contain no service role keys, OpenAI keys, Square secrets, Google secrets, database passwords, or connection strings.
- Optional missing Supabase tables show setup messages instead of breaking the dashboard.

## Navigation and Layout
- Every main nav item opens: Home, Work, Leads, Clients, Money, Tools.
- Mobile tabbar scrolls cleanly and does not overlap page content.
- Sidebar expands/collapses cleanly on desktop.
- Drawers open, scroll, save, cancel, and close correctly on desktop and mobile.

## Home Command Center
- Today/next-action cards render.
- Follow-ups due, hot leads, payments waiting, route status, and equipment alerts are visible when data exists.
- Empty states explain the next useful action.

## Work and Routes
- Work calendar renders.
- Jobs can be added, edited, rescheduled, completed, and deleted.
- Route planner works with pins.
- Route planner handles missing map pins or missing Google Maps key gracefully.

## Leads
- Pipeline is the default Leads view.
- Saved views work: Call Today, Follow-Up Due, High Priority, Quote Needed, Interested, Unverified Properties.
- CSV import preview works for company/prospect and property-location files.
- Add/edit/delete works for prospects, companies, and managed properties.
- Call logging and call history work for lead phone numbers.
- Create Quote Lead behavior is labeled clearly.

## Clients and Money
- Client/property profiles render with jobs, documents, route history, and follow-ups.
- Estimates/invoices/documents render.
- Square sync states and payment-waiting states are clear.

## Tools and Admin
- Equipment inventory, maintenance, and hardware guide render.
- Groundskeeper AI admin page renders without exposing secrets.
- Backup export includes every dashboard data collection.
- Demo-mode backup import restores all exported collections.
- Export buttons create usable CSV/JSON files.
- Refresh and demo reset work.
