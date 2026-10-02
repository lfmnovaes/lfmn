import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

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
    await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'sun');
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect(page.locator('a[download]')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute(
      'lang',
      path.startsWith('/pt-BR') ? 'pt-BR' : 'en',
    );
  }
  expect(requested.some((path) => sceneChunks.has(path))).toBe(true);
  expect(requested.some((path) => /\/textures\/universe\//.test(path))).toBe(true);
});
