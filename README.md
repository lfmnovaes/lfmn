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
- `src/messages` holds English and Portuguese content. `src/i18n/types.d.ts` types message keys and locales; the explicit lazy loaders check both message shapes.
- `src/components` holds portfolio sections and interactive components; `ui` holds adapted shadcn/Base UI primitives. Segmented controls share an indicator and a CSS module. Overlay portals inherit the palette from `SiteShell`.
- Static sections and portrait markup stay on the server. `PortraitMagnet`, `NameHover`, and `TechnologyCarousel` accept rendered children and own only their browser interactions.
- `src/hooks/use-market-chart.ts` owns visibility, requests, WebSocket retries, and chart cleanup. Selection state stays in `MarketPanel`.
- `src/lib/market-data.ts` validates external data; `market-chart.ts` adapts Lightweight Charts and loads on demand. Its theme observer repaints from inherited CSS tokens without restarting market requests.
- `src/app/globals.css` holds shared tokens, section styles, and responsive rules. The name decoration and segmented controls use colocated CSS modules. Local marquee buttons support keyboard browsing and persistent pausing.
- Language links keep their native navigation behavior. Supporting browsers animate the selection using cross-document View Transitions; reduced motion uses the static selection.

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

Biome organizes imports into built-ins, framework packages, other packages, repository aliases, and relative paths. Side-effect imports retain their order.

## Universe development preview

With `npm run dev`, open `/universe-preview` or `/pt-BR/universe-preview`, then select **Enter Universe**. The preview uses primitive geometry for the Sun and planets through Pluto, accessible planet selection, camera focus, zoom, and motion pausing. Reduced motion uses a stationary scene with direct focus changes.

Three.js/R3F load only on entry. The initial preview still uses career summaries and résumé downloads; the revised roadmap replaces them with EN/PT facts about the Sun and planets, with no biography or downloads in Universe. Unsupported WebGL or failed scene loading keeps the DOM content and Normal return available. The preview returns 404 in production, and the public Universe control stays WIP until the roadmap's release checks pass.

Universe code and styles live in `src/components/universe`. Its renderer uses Three meshes rather than DOM elements, so Biome's `noStaticElementInteractions` exception is scoped to that file; named DOM controls provide keyboard equivalents for canvas selection. Textures, gestures, and drawers belong to later roadmap stages.

Three.js and its types are pinned to r182 because stable React Three Fiber 9 still constructs `THREE.Clock`, deprecated in r183 onward. Revisit the pin when Fiber's replacement scheduler reaches a stable release; do not suppress the warning or patch dependency internals.

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
