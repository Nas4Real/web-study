# Design Target Registry

The live `WEB STUDY` Superdesign project is the primary visual source. This registry captures what was actually available on 2026-09-30 and prevents screenshot-backed states from being mistaken for live drafts.

## Source order

1. Newest relevant live Superdesign state.
2. A missing state created in the same Superdesign project.
3. V4 screenshots for Task Details and Session Details.
4. V2 screenshots for earlier approved screens.
5. Written UX and engineering contracts.
6. Historical preview HTML.

Locked product rules override placeholder design data. In particular, authentication supports email and Google, not Apple, and the V1 storage quota is 2 GiB.

## Live targets inspected

| Target | Draft ID | Version | Notes |
| --- | --- | ---: | --- |
| Calendar Day, Week, Month and New Session | `9fc1a7b4-af57-48f9-b645-88f741ca400a` | 53 | Current complete application draft |
| Quiet Precision design system | `8aa64fb9-b219-4ac8-bd46-210672382d9c` | 10 | Typography, palette, shell, and component language |
| Calendar Day branch | `3b6767a8-0995-4cc2-82b4-1d2798feea98` | — | Supporting branch |
| Calendar Day branch | `a9809a4a-d719-40a1-bf61-a7fe892b63b4` | — | Supporting branch |
| Verify-email template | `c25217df-66b1-4381-915f-bce780850460` | — | Email template, not an app auth page |
| Reset-password template | `f0e0603a-bc11-42b1-a6b9-f7d81489e926` | — | Email template, not an app auth page |

## Screenshot-backed targets

No current live node exposed Dashboard, Tasks, Documents, Settings, application auth pages, Task Details, or Session Details during inspection. Their current regression evidence is:

| Target | Reference | Viewport |
| --- | --- | --- |
| Dashboard | `design-reference/screenshots/v2/01_Dashboard.png` | 1440 × 1200 |
| Tasks | `design-reference/screenshots/v2/05_Tasks.png` | 1440 × 1200 |
| Documents | `design-reference/screenshots/v2/06_Documents.png` | 1440 × 1200 |
| Settings | `design-reference/screenshots/v2/07_Settings.png` | 1440 × 1200 |
| Sign in | `design-reference/screenshots/v2/13_Auth_SignIn.png` | 1440 × 900 |
| Sign up | `design-reference/screenshots/v2/14_Auth_SignUp.png` | 1440 × 900 |
| Forgot password | `design-reference/screenshots/v2/15_Auth_ForgotPassword.png` | 1440 × 900 |
| Task Details | `design-reference/screenshots/v4/17_TaskDetails.png` | 1440 × 1200 |
| Session Details | `design-reference/screenshots/v4/18_SessionDetails.png` | 1440 × 1200 |

Before implementing one of these states, inspect the live project again. If it is still missing and the story requires a live design, create the missing state in this same project without changing unrelated approved states.

The machine-readable counterpart is `src/fixtures/visual-targets.ts`.
