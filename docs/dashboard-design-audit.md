# Dashboard design-system audit

## Inconsistencies found

- Button heights, radii, colors, shadows, and hover motion varied by feature.
- Page headings ranged from compact utility titles to marketing-scale display text.
- Cards and panels used unrelated radii, border colors, shadows, and padding.
- Tabs used several active-state models: underlines, filled buttons, and page-specific colors.
- Inputs and search controls had differing heights, borders, focus states, and disabled styles.
- Tables varied in header weight, row padding, selected state, and mobile overflow behavior.
- Status labels reused page-specific colors and dimensions instead of semantic badge treatments.
- Drawers and modals used inconsistent surface styling and close-control dimensions.
- JavaScript-generated markup frequently received feature classes only, bypassing shared primitives.
- Many late stylesheet layers relied on broad selectors and `!important`, producing cascade conflicts.

## Standardization approach

- Keep existing feature classes and data attributes as behavior hooks.
- Apply one final shared component layer for buttons, forms, cards, tabs, badges, tables, headers, drawers, modals, toolbars, and empty states.
- Classify both static and dynamically inserted UI with additive shared classes.
- Preserve the protected navigation, authentication, routing, data, and workflow behavior.
- Use the existing Urban Yards palette, typeface, icon assets, spacing scale, and drawer timing.
