# Urban Yards Dashboard Design System

This is the source-of-truth design contract for the dashboard rebuild. A page is not complete just because it routes, loads data, or passes a syntax check. It must also follow this visual system and feel intentionally designed.

## 1. Design Intent

The dashboard should feel:

- professional, calm, modern, and owner-operated
- compact without feeling crowded
- easy for a new employee to understand
- consistent with the Urban Yards forest-green navigation theme
- useful on laptop, desktop, tablet, and mobile

The dashboard should not feel like unrelated widgets, stacked hotfixes, a squeezed desktop table, or a fake front end that must later be rebuilt around the backend.

## 2. App Shell

The dashboard shell is:

- desktop icon rail with expandable overlay drawer
- main content offset only by the closed rail width
- mobile navigation below `901px`
- no duplicate desktop rail and drawer systems
- no main-content shifting when the drawer opens

Desktop drawer behavior:

- closed state shows icons only
- open state shows the same icons plus labels
- icons stay pixel-stable between states
- secondary drawer content hides before primary nav icons are cut off

Mobile behavior:

- pages use full-width cards
- primary actions remain reachable
- default workflows should not require horizontal scrolling
- dense tables move into advanced/bulk views

## 3. Shared Tokens

`dashboard.css` is the loaded source of truth for the current static app. New dashboard UI must use existing tokens before adding page-specific values.

Required token groups:

- colors: `--color-bg`, `--color-surface`, `--color-surface-solid`, `--color-primary`, `--color-muted`, `--color-border`, `--color-danger`, `--color-warning`
- spacing: `--uy-page-pad`, `--uy-shell-gap`, `--uy-section-gap`, `--uy-card-pad`, `--uy-panel-pad`
- sizing: `--uy-button-h`, `--uy-rail-width`, `--uy-drawer-width`, `--uy-sidebar-icon`, `--uy-sidebar-icon-art`
- radius: `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-card`, `--radius-pill`
- shadows: `--shadow-card`, `--shadow-card-elevated`, `--shadow-button`, `--shadow-popover`
- type: `--font-ui`, `--font-size-xs`, `--font-size-sm`, `--font-size-md`, `--font-size-lg`, `--font-size-xl`, `--font-size-page`
- motion: `--transition-fast`, `--transition-normal`, `--transition-drawer`
- layers: `--z-base`, `--z-topbar`, `--z-sidebar`, `--z-popover`, `--z-modal`

Rules:

- add missing tokens once near the dashboard source-of-truth layer
- do not create private spacing scales for individual pages
- do not add new hotfix stylesheets
- do not solve one screen size by breaking another

## 4. Page Layout Contract

Every major page must follow the same structural rhythm:

1. page header with eyebrow, title, short purpose copy, search/filter where useful, and one primary action
2. summary row with the few metrics that matter for that page
3. primary working area
4. secondary/reference area
5. clear empty, loading, warning, and error states

Use these shared page classes where practical:

- `.uy-standard-page`
- `.uy-page-header`
- `.uy-section-header`
- `.uy-card`
- `.uy-card--compact`
- `.uy-card--elevated`
- `.uy-button`
- `.uy-button--primary`
- `.uy-button--secondary`
- `.uy-badge`
- `.uy-empty-state`

## 5. Page Contracts

### Home

Purpose: daily command view.

Must show:

- daily priorities
- overdue or blocked items
- upcoming work
- recent activity
- quick actions

Primary data requirements:

- open tickets
- work scheduled today
- overdue follow-ups
- overdue invoices/payments
- notifications
- recent ticket events

### Tickets

Purpose: central workflow board.

Must show:

- stage filters
- search
- ownership
- status
- next action
- ticket detail view

Primary data requirements:

- canonical job tickets
- ticket events/history
- linked lead/client/property/quote/budget/work/invoice records
- responsible role
- blockers and missing requirements

### Work

Purpose: assigned work and field execution.

Must show:

- assigned jobs
- calendar/schedule
- route access
- field instructions
- completion actions
- documents and photos

Primary data requirements:

- assigned tickets
- scheduled visits
- route stops
- documentation tasks
- arrival/completion photos
- time/mileage and field notes

### Leads

Purpose: sales pipeline and outreach.

Must show:

- prospect list
- outreach status
- follow-up dates
- contact actions
- quote/ticket creation

Primary data requirements:

- prospects
- companies
- properties
- contact activity
- quote requests
- lead-origin tickets

### Money

Purpose: financial workflow.

Must show:

- budgets
- quote status
- invoice status
- payment tracking
- job profitability
- accounting actions

Primary data requirements:

- quotes
- budget/cost review records
- invoices
- payments
- change orders/add-ons
- profitability summaries

### Tools

Purpose: supporting utilities and admin modules.

Must show:

- equipment
- documentation
- imports/exports
- route tools
- Groundskeeper AI
- user/admin utilities

Primary data requirements:

- equipment records
- documentation templates/submissions
- import/export jobs
- AI knowledge/settings
- users/access
- dashboard health diagnostics

## 6. Component Interface Contracts

Design-first does not mean disconnected. Each component should accept realistic data shapes and tolerate missing backend data.

Recommended shared interfaces:

- `PageHeader`: eyebrow, title, description, primaryAction, secondaryActions, search
- `SummaryMetric`: value, label, helper, tone, action
- `WorkflowCard`: title, owner, stage, nextAction, dueDate, blockers, linkedRecordIds
- `FilterBar`: search, status, owner, dateRange, serviceType, priority
- `DataList`: rows, emptyState, loadingState, errorState, rowActions
- `DetailDrawer`: title, status, sections, primaryAction, history, saveState
- `StatusBadge`: label, tone, icon, accessibleText
- `EmptyState`: title, body, action
- `LoadingState`: label, skeletonCount
- `ErrorState`: title, body, retryAction, setupAction

Sample data may be used only when a Supabase connection is not ready, and only behind demo/setup states. It must match the eventual component interface so the page can connect incrementally.

## 7. Buttons

Button hierarchy:

- primary: one main action per section
- secondary: supporting actions
- outline: standard low-risk actions
- ghost: quiet utility actions
- positive: completion/success actions
- warning: caution actions
- destructive: deletion/cancellation only after confirmation

Rules:

- no text-symbol icons such as `->`, raw `x`, `OK`, `CSV`, `JSON`, or `GV` when an icon pattern exists
- buttons wrap before overflowing
- mobile tap targets remain comfortable
- disabled states must still be readable
- loading states must show clear progress text

## 8. Cards, Tables, Forms, And Tabs

Cards:

- use consistent radius, border, padding, and shadow
- summarize before detail
- avoid nested cards unless the inner item is a repeated record

Tables:

- use only for bulk or advanced views
- avoid default table-first workflows on mobile/laptop
- horizontal scrolling is acceptable only in intentional table wrappers

Forms:

- labels are visible or semantically clear
- focus states use Urban Yards green/yellow styling
- validation errors appear near the field
- save state is visible: Saving, Saved, Save failed

Tabs and filters:

- active state is obvious and readable
- labels are short
- filters wrap cleanly
- mobile filters stack or collapse without hiding primary actions

## 9. Status, Loading, Empty, Warning, And Error States

Every rebuilt page must include:

- empty state for no records
- loading state for data fetches
- setup state for missing optional tables
- warning state for risky or overdue work
- error state with retry or setup guidance

Do not leave blank panels.

## 10. Responsive QA Targets

Visual QA must consider:

- `1280 x 720`
- `1366 x 768`
- `1440 x 900`
- `1536 x 864`
- `1920 x 1080`
- tablet widths around `768-1024`
- mobile under `760`

Pass criteria:

- no page content overlaps
- no primary action is clipped
- cards wrap naturally
- long text does not break cards
- mobile does not horizontally scroll in default views
- nav icons remain visible
- focus states are visible

## 11. Workflow Priority

The first complete workflow to prove end-to-end is:

Lead or client request -> Job Ticket -> Quote and approval -> Budget preparation -> Work assignment and scheduling -> Field completion and documentation -> Final invoice -> Closed ticket

Once verified, reuse those components across Home, Tickets, Work, Leads, Money, and Tools.
