# Theme Context

## Compact token summary

- Framework: Tailwind CSS 3.4.19 with PostCSS and Autoprefixer.
- Current code tokens: black document background and dark color scheme only.
- Live design authority: the `WEB STUDY` Superdesign project. Its approved output uses Poppins for UI text, IBM Plex Mono for metadata/time, and a black/zinc palette. Those live tokens will be ported in Story 01-03; the foundation must not invent substitutes.
- Breakpoints, radii, shadows, and spacing: Tailwind 3 defaults until the live values are recorded and ported.

## Raw source: `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

## Raw source: `src/styles/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  background: #000;
  color-scheme: dark;
}

body {
  margin: 0;
  min-height: 100vh;
}
```
