# spot-alert

Windsurf spot-forecast app: the user saves spots, sets a location (GPS or manual) and a max distance (km), and the app rates conditions at each spot for the next 8 days. First version is for personal use (Baltic Sea and North Sea, windsurfing only); a public multi-sport version is a possible far-future goal.

Full design and the decided scoring metric: `docs/design.md`. Work plan: GitHub issues #1-#9 (#10 = icebox).

## Stack (decided)
- TypeScript PWA, built with Vite + **React**, Vitest for tests
- Hosted on **GitHub Pages** (public repo) at https://hempllll.github.io/spot-alert/, auto-deployed from `main` by `.github/workflows/deploy.yml`. Vite `base` is `/spot-alert/`.
- MapLibre + OpenStreetMap-based tiles for the map
- Open-Meteo for forecast (wind) and marine (waves) data, called from the client
- Storage: IndexedDB / localStorage, JSON export/import of spots
- PWA via vite-plugin-pwa (Workbox). No backend in v1.
- Later: Capacitor wrapper, native Swift iOS widget (needs Mac + Xcode)

## Key rules
- The scoring engine is a **pure TypeScript module**: no UI, storage or network dependencies. Test cases are JSON data (spot + forecast -> expected score) so a later Swift port can reuse them.
- Spot and condition-set formats must stay plain JSON (the widget will need them).
- Units: wind in knots, directions in degrees, distances in km.
- Users define each spot's conditions themselves (no shore-orientation model, no quiver input).

## About the user
- Strong in Python, knows basics of other mainstream languages, new to TypeScript, web tooling and mobile development. Briefly explain web/TypeScript-specific concepts when they first come up.
- Develops on Linux Mint, tests on an iPhone via Add to Home Screen.
