# Urban Yards Weather Icon Pack

A consistent dashboard-ready weather icon set with **65 icons**.

## Included
- `svg/` — scalable transparent SVG icons
- `png-512/` — high-resolution transparent PNG icons
- `png-128/` — dashboard-optimized transparent PNG icons
- `manifest.json` — filenames, IDs, and common weather-condition aliases
- `weather-icons.js` — starter JavaScript import map
- `preview.png` — visual index of every icon

## Recommended use
Use the 128px PNG files for normal forecast cards and the SVG files when the dashboard already supports inline SVG assets. Display at roughly 28–56px in a seven-day forecast card.

## Naming
Condition icons use semantic kebab-case names such as:
- `clear-day`
- `partly-cloudy-night`
- `heavy-rain`
- `thunderstorm-rain`
- `snow-showers-day`

The pack also includes dashboard metric icons such as `humidity`, `pressure`, `visibility`, `uv-index`, `air-quality`, `sunrise`, and `sunset`.

## Codex instruction
Copy this entire folder into the dashboard's public assets directory. Use `manifest.json` as the source of truth. Map the weather API's text/code values to the closest semantic icon ID, prefer day/night-specific variants when the API provides an `is_day` value, and fall back to `cloudy` when a condition is unknown. Do not redraw, recolor, crop, or add backgrounds to the supplied icons.
