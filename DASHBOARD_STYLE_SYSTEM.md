# Urban Yards Dashboard Style System

This file documents the intended dashboard design and layout system so future work does not create duplicate systems.

## A. Design Intent

The Urban Yards dashboard should feel like:

- one polished owner operating system
- calm
- clean
- field-operations focused
- card-first
- action-first
- responsive across laptop, desktop, tablet, and phone

It should not feel like unrelated widgets, stacked hotfixes, or a squeezed desktop app on mobile.

## B. App Shell

The dashboard app shell is:

- desktop icon rail
- expandable overlay drawer
- main content area
- mobile nav below `901px`

Opening the drawer should not move, resize, or compress the main content. The main content should remain offset by the closed rail width only.

## C. CSS Tokens / Source Of Truth

This dashboard is currently a static HTML/CSS/JS app, so `dashboard.css` is the loaded source of truth. Do not add extra dashboard hotfix stylesheets or unused React-style component files unless the app architecture actually changes.

Shared layout values should come from dashboard variables. Current variables include both the legacy `--uy-*` layout tokens and the newer design-system aliases:

```css
:root {
  --color-bg: #f8f7ec;
  --color-surface: #fffdf4;
  --color-surface-soft: #f1f6e9;
  --color-primary: #123f31;
  --color-muted: #63756b;
  --color-border: #dfe5d5;
  --radius-card: 24px;
  --radius-pill: 999px;
  --shadow-card: 0 12px 30px rgba(18, 63, 50, 0.08);
  --shadow-button: 0 10px 24px rgba(18, 63, 49, 0.16);
  --transition-normal: 200ms ease;

  --uy-rail-width: 76px;
  --uy-drawer-width: 292px;
  --uy-sidebar-icon: 48px;
  --uy-sidebar-icon-art: 24px;
  --uy-page-pad: 16px;
  --uy-card-pad: 24px;
  --uy-section-gap: 20px;
  --uy-button-h: 42px;
  --uy-mobile-nav-height: 68px;
  --uy-topbar-height: 72px;
}
```

Rules:

- Do not hardcode these repeatedly in random sections.
- Use variables for layout changes.
- If a token name is missing, add it once near the dashboard source-of-truth layer instead of creating page-specific constants.
- Do not create a second spacing scale for one dashboard page.
- Theme, compact, and reduced-motion hooks are applied with `data-theme`, `data-compact`, and `data-reduced-motion` on the document element.

## D. Page Structure

Each dashboard section should follow this rhythm:

1. page header / command header
2. summary metrics or key actions
3. primary content
4. secondary/details

Do not make pages feel like unrelated widgets. Reuse shared header, card, action, and spacing patterns.

## E. Cards And Panels

Rules:

- Cards should wrap.
- Cards should have consistent padding, radius, shadow, and spacing.
- Cards should show summary first.
- Details should go into drawers, modals, expanded rows, or detail panels.
- Avoid card-specific one-off styles unless necessary.
- A card should not become a private layout system.

## F. Buttons And Actions

Rules:

- Use consistent button hierarchy.
- Primary action should be obvious.
- Secondary actions should wrap or go into a More menu.
- Avoid too many visible buttons in cards.
- Do not add text-symbol icons like `x`, `OK`, `M`, `CSV`, `JSON`, `PDF`, `GV`, arrows, or slashes when an icon component or existing visual pattern is available.
- Keep touch targets comfortable on mobile.

## G. Tables

Rules:

- Tables are for bulk or advanced views.
- Cards/lists should be preferred for everyday responsive workflows.
- Horizontal scroll is acceptable only in intentional table mode.
- Do not make a table the default if it breaks laptop/mobile layouts.

## H. Drawers And Modals

Rules:

- Drawers are allowed to scroll internally.
- Modals are allowed to scroll internally.
- Drawers/modals should not cause background layout jumps.
- On mobile, drawers should become full-screen sheets if needed.
- Drawer and modal z-index values should follow the documented layer order.

## I. Responsive Density

Responsive density modes:

- normal desktop
- short laptop
- very short laptop
- tablet/mobile

Rules:

- Reduce spacing and secondary content first.
- Do not shrink text to unreadable sizes.
- Keep main actions and nav visible.
- Avoid hiding important primary actions.
- Height-based density should not redesign the page.

## J. Icons

Rules:

- Icon size should be stable.
- The same concept should use the same icon.
- Avoid creating multiple icon folders/systems unless documented.
- Future cleanup should move toward one reusable dashboard icon registry.
- Do not let icons move between drawer open and closed states.

## K. Z-Index / Layers

Intended layering order:

1. base content
2. sticky topbar
3. sidebar rail
4. expanded drawer
5. notification popover
6. modal/drawer overlays

Avoid random z-index values without checking existing layers.
