# Superdesign to Production Porting Contract V4

## Do

- inspect live target before coding
- reuse exact layout/tokens/classes/asset identity as practical
- translate behavior/runtime mechanically into React/Next.js
- remove Superdesign preview-only runtime/bridge code
- preserve Poppins/IBM Plex Mono usage and exact Iconify icon identity where approved
- create missing product states in the same Superdesign project before coding
- verify with deterministic Playwright screenshots

## Do not

- rebuild approved pages from memory/screenshot by eye when live source is accessible
- replace design with a generic component library
- opportunistically migrate Tailwind major during parity work
- silently “improve” spacing/typography/colors
- ask Nas for exports that Codex can read from the live project

## Tailwind compatibility

Detect the live output's Tailwind version/semantics. If it uses v3-style config/play-CDN conventions, compile against Tailwind 3.4.x for initial parity. Tailwind 4 migration is a later explicit change because official upgrade docs list visual-impacting breaking changes.
