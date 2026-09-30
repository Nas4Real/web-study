# Theme Context

- Framework: Tailwind CSS 3.4.19 with PostCSS and Autoprefixer.
- Canonical implementation: `tailwind.config.ts` and `src/styles/globals.css`.
- Canonical design evidence: `.superdesign/design-system.md` and the live Quiet Precision draft v10.
- Fonts: Poppins 400/500/600/700 for UI; IBM Plex Mono 500/600 for time and metadata, bundled through `next/font`.
- Shell: black base, 12 px outer padding/gap, 240 px sidebar, 20 px workspace radius, `0 20px 60px rgba(0,0,0,.4)` shadow.
- Tailwind semantic colors: `base`, `panel`, `card`, `card-hover`, `border-base`, `border-panel`, `border-hover`, `text`, `text-secondary`, `text-muted`, `text-tertiary`, `text-disabled`, and subject tones `algebra`, `analysis`, `physics`, `mechanics`, `method`, `languages`.

Always pass the real source files plus `.superdesign/design-system.md` to future design commands; this summary is discovery context, not a replacement for visual code.
