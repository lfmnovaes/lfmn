# lfmn

This is a [Next.js](https://nextjs.org/) project.

## Getting started

Install dependencies and start the development server:

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Edit `src/app/[locale]/page.tsx` to update the page. Changes appear automatically during development.

## Project structure

- `src/app/[locale]/page.tsx` composes the portfolio and generates localized metadata.
- `src/messages` holds English and Portuguese content. Section props use its inferred types.
- `src/components` holds portfolio sections and interactive components; `ui` holds the shared Base UI primitives.
- Static sections and portrait markup stay on the server. `PortraitMagnet`, `NameHover`, and `TechnologyCarousel` accept rendered children and own only their browser interactions.
- `src/hooks/use-market-chart.ts` owns visibility, requests, WebSocket retries, and chart cleanup. Selection state stays in `MarketPanel`.
- `src/lib/market-data.ts` validates external data; `market-chart.ts` adapts Lightweight Charts and loads on demand.
- `src/app/globals.css` holds shared tokens, section styles, and responsive rules. The name decoration uses a colocated CSS module.

## Production

```sh
npm run build
npm start
```

## Checks

```sh
npm run format
npm run lint
npm run typecheck
```

## Tests

Install the browsers used by Playwright:

```sh
npx playwright install chrome firefox webkit
```

Run the development regression and production browser tests:

```sh
npm run test:dev
npm run build
npm test
```

Stop other development servers for this project before running `npm run test:dev`. Tests start local servers on ports 3102 (development) and 3100 (production).
