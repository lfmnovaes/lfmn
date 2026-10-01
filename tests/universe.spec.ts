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

test('production Normal never requests Universe chunks and the preview stays unavailable', async ({
  page,
}) => {
  expect(sceneChunks.size).toBeGreaterThan(0);
  const requested: string[] = [];
  page.on('request', (request) => requested.push(new URL(request.url()).pathname));
  for (const path of ['/', '/pt-BR']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Luis');
    const universe = page.getByRole('button', { name: /^(Universe|Universo) —/ });
    await universe.click({ force: true });
    await expect(page.getByRole('tooltip')).toBeVisible();
    await expect(universe).toHaveAttribute('aria-disabled', 'true');
  }
  expect(requested.filter((path) => sceneChunks.has(path))).toEqual([]);
  expect(requested.filter((path) => /\/textures\//.test(path))).toEqual([]);
  for (const path of ['/universe-preview', '/pt-BR/universe-preview']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  }
  expect(requested.filter((path) => sceneChunks.has(path))).toEqual([]);
});
