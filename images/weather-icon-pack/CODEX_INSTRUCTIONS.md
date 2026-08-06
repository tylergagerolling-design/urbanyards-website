# Codex Implementation Instructions

Add the supplied Urban Yards weather icon pack to the dashboard without changing existing weather functionality or page architecture.

1. Copy the icon pack into the project's public assets directory, preserving its folder structure.
2. Use the transparent `png-128` files for the seven-day cards unless the existing component supports SVG cleanly.
3. Build one centralized weather-condition-to-icon resolver. Do not scatter filename logic across card components.
4. Use day/night variants whenever the API exposes `is_day`, sunrise/sunset, or an equivalent indicator.
5. Match exact conditions first, then common aliases from `manifest.json`, then broader condition families.
6. Use `cloudy` as the final fallback so broken icon paths never appear.
7. Keep icons proportional with `object-fit: contain`; do not crop, tint, recolor, distort, or place them inside colored circles.
8. Suggested card display size: 40–52px desktop and 34–44px mobile.
9. Preserve accessibility by setting useful alt text such as “Heavy rain” or marking decorative duplicate icons with an empty alt attribute.
10. Do not modify unrelated dashboard functionality, spacing, navigation, or API behavior.
