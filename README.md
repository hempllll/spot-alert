# spot-alert

Windsurf spot-forecast PWA. Save spots, set a location and max distance, and get
each spot's conditions rated for the next 8 days. Personal use first (Baltic / North
Sea, windsurfing). See [CLAUDE.md](CLAUDE.md) and [docs/design.md](docs/design.md).

## Stack

- Vite + React + TypeScript
- Vitest for tests
- Deployed to GitHub Pages at https://hempllll.github.io/spot-alert/

## Development

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173/spot-alert/)
npm test         # run the test suite once
npm run test:watch  # run tests in watch mode
npm run lint     # lint with oxlint
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build locally
```

## Deployment

Pushing to `main` triggers the GitHub Actions workflow in
[.github/workflows/deploy.yml](.github/workflows/deploy.yml), which builds the app and
publishes `dist/` to GitHub Pages.
