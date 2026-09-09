# Dashboard visual consistency pass — September 8, 2026

Reviewed Home, Tickets, Work, Leads, Clients, Money, Tools, Route Planner, Call Queue, Documentation, and Import & Export, plus the unified ticket and forms.

## Improvements

- All eleven destinations share one header class and tokens: 36px desktop / 28px mobile titles, matching subtitle spacing, forest-green actions, 44px header controls, an identical gold divider accent, and shared page gutters.
- Removed repeated page-name eyebrows and the separate Clients and Call Queue header treatments. Leads now uses a proper page-level heading matching its navigation label.
- Moved Tickets and Work filters into a separate toolbar below the title and actions. Tools loading notices follow its header so the title stays in place.
- Replaced letter abbreviations and assorted text glyphs with the existing SVG icon family for shared action buttons, header controls, and Call Queue phone/website actions.
- Long ticket visit windows, numbers, crew names, and status labels wrap within their cells. Laptop ticket rows have more space, and Work status labels stay within their column.
- Preserved content-dependent wrapping on small screens; headers share typography and spacing rather than forcing long descriptions or actions into a fixed height.

## Verification

- Main workspace measurements and screenshots at 1920, 1440, 1024, 768, 390, and 320px (66 page/viewport combinations).
- Unified ticket sections, ticket edit form, Add Client, and Money menu: 45 layout checks across desktop and phone widths.
- 42 feature checks plus Work filters, menus, shared notes, editing/cancel, and return navigation at four widths.
- `npm run check` and all 344 tests passed. The Money loading test includes the real shared icon renderer.

Browser checks use local sample records with external requests blocked. Weather and map fallbacks in those screenshots are expected. Evidence is retained locally in `artifacts/dashboard-qa/`.

Asset version: `20260908-visual-consistency-1`.
