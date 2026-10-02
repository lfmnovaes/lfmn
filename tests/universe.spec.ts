import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import en from '../src/messages/en.json';
import pt from '../src/messages/pt-BR.json';

const chunksDirectory = join(process.cwd(), '.next/static/chunks');
const sceneChunks = new Set(
  readdirSync(chunksDirectory)
    .filter(
      (file) =>
        file.endsWith('.js') &&
        /WebGLRenderer|focusedPlanet/.test(readFileSync(join(chunksDirectory, file), 'utf8')),
    )
    .map((file) => `/_next/static/chunks/${file}`),
);

test('production Normal never prefetches the renderer and both Universe locales load automatically', async ({
  page,
}) => {
  expect(sceneChunks.size).toBeGreaterThan(0);
  const requested: string[] = [];
  const clockWarnings: string[] = [];
  page.on('console', (message) => {
    if (message.text().includes('THREE.Clock')) clockWarnings.push(message.text());
  });
  page.on('request', (request) => requested.push(new URL(request.url()).pathname));
  for (const path of ['/', '/pt-BR']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Luis');
    const universe = page.getByRole('link', { name: /^(Universe|Universo)$/ });
    await universe.hover();
    await universe.focus();
    await expect(universe).not.toHaveAttribute('aria-disabled');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
  }
  expect(requested.filter((path) => sceneChunks.has(path))).toEqual([]);
  expect(requested.filter((path) => /\/textures\//.test(path))).toEqual([]);
  for (const path of ['/universe', '/pt-BR/universe']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'sun', {
      timeout: 15000,
    });
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect(page.locator('a[download]')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute(
      'lang',
      path.startsWith('/pt-BR') ? 'pt-BR' : 'en',
    );
  }
  expect(clockWarnings).toEqual([]);
  expect(requested.some((path) => sceneChunks.has(path))).toBe(true);
  expect(requested.some((path) => /\/textures\/universe\//.test(path))).toBe(true);
});

test('planet navigation retains its responsive layout when entering from Normal and shared CSS arrives last', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [path, copy] of [
    ['/', en],
    ['/pt-BR', pt],
  ] as const) {
    await page.goto(path);
    await page.getByRole('link', { name: copy.nav.universe, exact: true }).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'sun', {
      timeout: 15000,
    });
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    const group = page.getByRole('group', { name: copy.universe.planetNavigation });
    // Reproduce the existing primitive stylesheet arriving after the route stylesheet.
    await group.evaluate((element) => {
      const primitive = element.classList[0];
      const rules: string[] = [];
      function collect(list: CSSRuleList) {
        for (const rule of list) {
          if (rule instanceof CSSStyleRule && rule.selectorText === `.${primitive}`)
            rules.push(rule.cssText);
          else if ('cssRules' in rule) collect((rule as CSSGroupingRule).cssRules);
        }
      }
      for (const sheet of document.styleSheets) collect(sheet.cssRules);
      if (!rules.length) throw new Error('Missing shared segmented-control stylesheet');
      const late = document.createElement('style');
      late.textContent = rules.join('\n');
      document.head.append(late);
    });
    for (const width of [320, 900, 1440]) {
      await page.setViewportSize({ width, height: 740 });
      await expect
        .poll(() =>
          group.evaluate((element) => {
            const items = [...element.querySelectorAll('button')].map((button) =>
              button.getBoundingClientRect(),
            );
            return {
              flow: getComputedStyle(element).gridAutoFlow,
              rows: new Set(items.map((item) => item.y)).size,
              columns: new Set(items.map((item) => item.x)).size,
            };
          }),
        )
        .toEqual({ flow: 'row', rows: width >= 900 ? 10 : 2, columns: width >= 900 ? 1 : 5 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(width);
    }
    for (const [id, name] of Object.entries(copy.universe.bodies)) {
      const body = group.getByRole('button', { name, exact: true });
      await body.click();
      await expect(body).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', id);
    }
  }
});
