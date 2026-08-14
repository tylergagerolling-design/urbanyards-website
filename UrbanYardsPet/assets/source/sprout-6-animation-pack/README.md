# Urban Yards — Sprout 6 Animation Pack

This pack deliberately contains ONLY the six approved Sprout animations.

## Animations
1. idle_blink
2. thinking
3. working
4. attention
5. celebrate
6. sleep

Each animation contains exactly 8 frames.

## Production frame specification
- 512 x 512 pixels
- Transparent RGBA PNG
- 8 frames per animation
- 48 PNG frames total
- Sprout's green body is anchored to (256, 256)
- Props/effects do not affect centering
- One global scale (2.8x) across all 48 frames
- No per-frame resizing
- Minimum required safe margin: 32px
- Smallest measured margin in this export: 34px
- Clipping failures: 0

## Loop timing
- idle_blink: 1.2 sec
- thinking: 1.4 sec
- working: 1.4 sec
- attention: 1.2 sec
- celebrate: 2.0 sec
- sleep: 2.0 sec

## File formats
Each animation folder contains:
- 8 individual PNG frames
- animated PNG with `.png` extension
- explicit `.apng`
- `.gif`
- 8-frame transparent strip

APNG / individual PNG frames should be treated as the production assets.
GIF is included primarily for easy preview/fallback because GIF transparency is limited.

## Desktop-pet behavior
idle_blink -> default
thinking -> Lawnmower Man is reasoning
working -> Lawnmower Man is carrying out a task
attention -> something needs attention
celebrate -> positive event / task complete / payment received
sleep -> extended idle state

## Rendering
This Sprout design is painted/chibi artwork, not hard-edged pixel art.
For WPF or another Windows renderer, use high-quality interpolation rather than NearestNeighbor.

See:
- `sprite-manifest.json`
- `validation.json`
- `QA_ALL_48_FINAL_FRAMES.png`
- `ALL_6_ANIMATIONS_PREVIEW.gif`
