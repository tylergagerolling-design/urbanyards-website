# Urban Yards Dashboard QA Checklist

Use this checklist before pushing dashboard changes live.

## Access and Security
- Login works with Supabase Auth.
- Demo mode works and does not touch live Supabase, Square, maps, or AI services.
- Frontend files contain no service role keys, OpenAI keys, Square secrets, Google secrets, database passwords, or connection strings.
- Optional missing Supabase tables show setup messages instead of breaking the dashboard.

## Navigation and Layout
- Every main nav item opens: Home, Tickets, Work, Leads, Money, Tools; secondary Clients, Call Queue, Documentation, Route Planner, and Import & Export routes also open.
- Mobile tabbar scrolls cleanly and does not overlap page content.
- Sidebar expands/collapses cleanly on desktop.
- Drawers open, scroll, save, cancel, and close correctly on desktop and mobile.
- Home summary cards, schedule rows, and ticket numbers fit at 320 pixels without overlapping.
- Status messages do not block underlying controls; Undo remains clickable.
- Search fields keep focus and cursor selection while results update.

## Unified Ticket
- Quote, Invoice, and Costs & Closeout sections use the same ticket throughout the job.
- Quote revisions preserve pricing and terms; approval preserves itemized amounts.
- Ticket edits save, Cancel discards edits, and Back returns to the originating workspace.
- Notes appear in both Work and the ticket. A failed save retains the text and allows retry.

## Home Command Center
- Today/next-action cards render.
- Follow-ups due, hot leads, payments waiting, route status, and equipment alerts are visible when data exists.
- Empty states explain the next useful action.

## Work and Routes
- Work calendar renders.
- Jobs can be added, edited, rescheduled, completed, and deleted.
- Route planner works with pins.
- Route planner handles missing map pins or missing Google Maps key gracefully.
- This Week filters scheduled visits from Monday through Sunday; All Dates restores the full list.
- Empty filters show a useful message and zero-task jobs have valid progress values.

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
- Field Tools, Records & Data, and Administration destinations open their current workspaces.
- Advanced administration remains open when switching Approvals, Communications, Templates, Automation, and Reports tabs.
- Retired Equipment and dashboard AI interfaces remain absent from navigation.
- Backup export includes every dashboard data collection.
- Demo-mode backup import restores all exported collections.
- Export buttons create usable CSV/JSON files.
- Refresh and demo reset work.
