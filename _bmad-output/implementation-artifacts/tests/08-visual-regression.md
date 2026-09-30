# Visual Regression Test Specification V4

## Authority

Live Superdesign is primary. Bundled screenshots are committed regression evidence. New V4 references:

- `design-reference/screenshots/v4/17_TaskDetails.png`
- `design-reference/screenshots/v4/18_SessionDetails.png`

## Required states

Dashboard; Calendar Day/Week/Month; Tasks; Documents; Settings; profile dropdown; New Task; Exam/University/Revision New Session; auth screens; Task Details; Session Details; recurrence controls; occurrence-vs-series prompt; notification preferences; Developer/API key management; destructive confirmations; verification/reset states.

## Rules

- deterministic viewport, clock, data and fonts
- freeze transitions/animations
- generate baselines in same OS/browser environment used for comparison
- compare spacing/typography/color/borders/radii/icons/backdrop/selected states
- do not hide regressions by raising thresholds without reviewed rationale
- a Tailwind-major migration requires a separate baseline review, never piggyback on the initial port
