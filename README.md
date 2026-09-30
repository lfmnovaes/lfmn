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
