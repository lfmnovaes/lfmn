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

Open `/universe-preview` or `/pt-BR/universe-preview`, or choose **Universe** in Normal's mode switch. The scene starts automatically, with textured planets, a boiling Sun shader, Earth clouds, Saturn rings, an instanced asteroid belt, and a distant galaxy/star field. Scroll within the scene to travel, drag to orbit, or pinch to zoom; named buttons provide keyboard equivalents. Reduced motion uses stationary orbits and direct focus changes.

Three.js/R3F and textures load only on Universe entry; Normal does not prefetch them. Both modes share the mode switch, icon-only GitHub link, and EN/PT control. Next.js mode links preserve Normal's lighting state; locale links retain the current mode. The preview is available in production but stays noindex. EN/PT facts contain NASA-sourced astronomy information, with no biography or downloads in Universe. The Base UI/shadcn Sheet pauses rendering while open and handles focus, Escape, and scroll locking. Unsupported WebGL or failed loading keeps facts and the Normal return available; without JavaScript, native details expose every body's facts.

Universe code and styles live in `src/components/universe`; `use-universe-controls` owns local selection and transient gesture refs. Camera/gesture patterns, body layers, Sun GLSL, and the HUD adapt [Tan Phan's ExperienceOrbit at revision 0d488de](https://github.com/TanPhan263/portfolio-website/tree/0d488deae979d06dd19d15638161502d5fd8af47/src/containers/experience-orbit). The Three mesh interaction exception is scoped to `universe-bodies.tsx`; no `biome-ignore` comments are needed. Texture ownership and postprocessing cleanup are local to the renderer. All facts/controls remain usable while decorative maps arrive or fail; the top bar reflects actual pending work.

The twelve WebP maps total about 360 KiB; source, credit, license, and conversion details are in [texture credits](public/textures/universe/CREDITS.md) and linked in the scene. Hardware desktops use Three.js's existing bloom/vignette passes; mobile and known software renderers use a small glow sprite and CSS vignette. DPR, stars, asteroid count, geometry, and effect resolution are capped. U2/U3 add no dependencies. The unused WIP tooltip, state, CSS, and locale copy were removed when mode navigation was enabled.

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
