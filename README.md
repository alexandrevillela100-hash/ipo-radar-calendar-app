# IPO Radar — Calendar app

Standalone React + Vite + TypeScript front-end that reads SEC filings from
Sanity and (eventually) renders them as a month-view calendar with a
detail panel. Deployed on Vercel's free tier.

## Status

- **v0.1 (this commit)**: thin-slice deploy — fetches filings from Sanity
  on page load and shows a count. Proves the Sanity → React → Vercel
  pipeline works end-to-end.
- **v0.2 (next)**: month-grid calendar with colour-coded filing dots.
- **v0.3**: detail panel, filter chips, "today" indicator.
- **v0.4**: mobile polish, responsive grid.

## Stack

- Vite + React 18 + TypeScript
- `@sanity/client` for read-only Sanity CDN queries (no token needed)
- Hand-rolled CSS using Velocia design tokens (no Tailwind)

## Local development (optional — Vercel handles deploys)

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # produces dist/
npm run preview  # serves the built dist/ locally
```

## Configuration

The Sanity project ID (`8896dke9`), dataset (`production`), and API
version (`2024-10-01`) are baked in as defaults in
`src/lib/filingsClient.ts`. None of these are sensitive (the project ID
is visible in any Sanity Studio URL), so there's no secret to manage.

If you ever want to override (e.g. point at a staging dataset), set Vercel
environment variables: `VITE_SANITY_PROJECT_ID`, `VITE_SANITY_DATASET`,
`VITE_SANITY_API_VERSION`.

## Deploy

Push to `main` on GitHub → Vercel auto-builds and deploys to the public
URL within ~30 seconds. Preview URLs spin up automatically for any
non-`main` branch.
