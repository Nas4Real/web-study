# Web Study Design System — Quiet Precision v10

This file records the inspected live design evidence for implementation. The authority remains the live `WEB STUDY` Superdesign project (`71292a60-75e4-449b-a39f-0456ec77d72f`), not this summary.

## Provenance

- Primary full-application interactive draft: `3b6767a8-0995-4cc2-82b4-1d2798feea98`, version 96. This single prototype contains the auth gate plus Dashboard, Calendar, Documents, Tasks, Settings, and the current dialog/detail states. Entering arbitrary demo credentials and submitting Sign In reveals the workspace screens.
- Design-system draft: `8aa64fb9-b219-4ac8-bd46-210672382d9c`, version 10.
- Calendar application draft: `9fc1a7b4-af57-48f9-b645-88f741ca400a`, version 53.
- Auth drafts: Sign In `ad60089a-7f2b-4f18-abd4-b128905d3d02`, Sign Up `222968f4-9d54-4317-9726-340922d4eea2`, Forgot Password `1b113538-7501-43e4-8e3d-e55370d80eca`, version 1.
- Styling convention: Tailwind CSS v3-style utilities and configuration.
- Inspection date: 2026-10-02.

## Typography

- UI text: Poppins, weights 400, 500, 600, and 700.
- Time and metadata: IBM Plex Mono, weights 500 and 600.

## Color tokens

| Token | Value |
| --- | --- |
| `base` | `#000000` |
| `panel` | `#09090b` |
| `card` | `#121214` |
| `card-hover` | `#18181b` |
| `border-base` | `#1f1f22` |
| `border-panel` | `#27272a` |
| `border-hover` | `#3f3f46` |
| `text` | `#fafafa` |
| `text-secondary` | `#d4d4d8` |
| `text-muted` | `#a1a1aa` |
| `text-tertiary` | `#71717a` |
| `text-disabled` | `#52525b` |
| `algebra` | `#ec4899` |
| `analysis` | `#06b6d4` |
| `physics` | `#10b981` |
| `mechanics` | `#3b82f6` |
| `method` | `#f59e0b` |
| `languages` | `#eab308` |
| `focus-soft` | `#001f29` |

## Shell geometry

- Outer padding and gap: 12 px.
- Sidebar width: 240 px.
- Workspace radius: 20 px.
- Workspace shadow: `0 20px 60px rgba(0, 0, 0, 0.4)`.

Port exact component dimensions and states from the newest relevant live draft. These compact tokens are implementation aids, not permission to infer or redesign missing screens.
