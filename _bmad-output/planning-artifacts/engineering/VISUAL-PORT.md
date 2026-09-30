# Live Superdesign to React Port Procedure V4

## Goal

Preserve approved UI as code, not a visual approximation.

## Procedure per target

1. Inspect the newest relevant state in Nas's existing live Superdesign project.
2. Determine exact typography/icon/token/Tailwind assumptions.
3. If the required state is missing, create/iterate it in the same project before code.
4. Translate approved markup/structure into TSX with minimal visual changes.
5. Replace preview-only navigation/JS with application behavior.
6. Use deterministic fixture DTOs shaped like future service read models.
7. Capture Playwright screenshot in a pinned environment after fonts load.
8. Compare and manually inspect diff.
9. Fix parity before abstraction.
10. Extract reusable components only after fidelity is established.
11. Replace fixtures with real service data while preserving DOM/layout where practical.

## Do not port

Screenshot bridge, preview postMessage listeners, dynamic draft loader, Petite-Vue preview runtime, fake page-switching scripts.

## Tailwind

Tailwind v4 has documented breaking style changes. Pin the live project's current Tailwind major for initial parity. Treat migration as a separate story only after baselines exist.

## Historical assets

V4/V2 screenshots and old preview HTML are debugging/regression inputs only. Live Superdesign wins.
