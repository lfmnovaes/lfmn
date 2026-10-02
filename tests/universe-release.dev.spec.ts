import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import en from '../src/messages/en.json';
import pt from '../src/messages/pt-BR.json';
import { trackUniverseFrames, trackUniverseResources } from './universe-fixtures';

test('maps arriving after shader compilation display Earth and Neptune in their actual colors', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/textures/universe/*.webp', async (route) => {
    await pending;
    await route.continue();
  });
  await page.goto('/universe', { waitUntil: 'domcontentloaded' });
  try {
    await expect(page.getByRole('button', { name: en.universe.zoomIn })).toBeEnabled();
    await page.getByRole('button', { name: 'Earth', exact: true }).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'earth');
  } finally {
    release();
  }
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  for (const body of ['Earth', 'Neptune']) {
    await page.getByRole('button', { name: body, exact: true }).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', body.toLowerCase());
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    const screenshot = await page.locator('canvas').screenshot();
    const colors = await page.evaluate(async (data) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Cannot inspect rendered colors');
      context.drawImage(image, 0, 0);
      const { data: pixels } = context.getImageData(
        image.width * 0.4,
        image.height * 0.35,
        image.width * 0.2,
        image.height * 0.3,
      );
      let blue = 0;
      let green = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const [r, g, b] = pixels.slice(index, index + 3);
        if (b > 70 && b > r * 1.6 && b > g * 1.2) blue++;
        if (g > 40 && g > r * 1.05 && g > b * 1.05) green++;
      }
      return { blue, green };
    }, screenshot.toString('base64'));
    expect(colors.blue).toBeGreaterThan(100);
    if (body === 'Earth') expect(colors.green).toBeGreaterThan(10);
  }
});

for (const [locale, copy] of [
  ['en', en],
  ['pt-BR', pt],
] as const) {
  test(`${locale}: real context loss releases the scene, retains accessible facts, and reloads`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(trackUniverseResources);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const path = `${locale === 'en' ? '' : '/pt-BR'}/universe`;
    await page.goto(path);
    await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'sun');
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await page.locator('canvas').evaluate((canvas) => {
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Expected a canvas');
      const context = canvas.getContext('webgl2');
      const extension = context?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('Cannot exercise native context loss');
      extension.loseContext();
    });
    await expect(page.getByRole('status')).toHaveText(copy.universe.unavailable);
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByRole('button', { name: copy.universe.zoomIn })).toBeDisabled();
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => Reflect.get(window, 'universeResources')))
      .toEqual({ contexts: 0, textures: 0 });
    await page.getByRole('button', { name: copy.universe.bodies.pluto, exact: true }).click();
    await page.getByRole('button', { name: copy.universe.explore }).click();
    await expect(page.getByRole('dialog')).toContainText(copy.universe.content.pluto.description);
    await page.keyboard.press('Escape');
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(audit.violations).toEqual([]);
    await page.getByRole('button', { name: copy.universe.reload }).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'sun');
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect(page.locator('a[download]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('leaving during renderer or map loading cannot mount a late scene in Normal', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(trackUniverseResources);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const pattern of [
    '**/_next/static/chunks/node_modules_three_*',
    '**/textures/universe/*.webp',
  ]) {
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let held = 0;
    await page.route(pattern, async (route) => {
      held++;
      await pending;
      await route.continue();
    });
    await page.goto('/universe', { waitUntil: 'domcontentloaded' });
    try {
      await expect.poll(() => held).toBeGreaterThan(0);
      await expect(page.getByRole('progressbar')).toBeVisible();
      await page.getByRole('link', { name: 'Normal', exact: true }).click();
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Luis');
    } finally {
      release();
    }
    await page.waitForLoadState('networkidle');
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => Reflect.get(window, 'universeResources')))
      .toEqual({ contexts: 0, textures: 0 });
    await expect(page.locator('a[download]')).toHaveCount(2);
    await page.unroute(pattern);
  }
  expect(errors).toEqual([]);
});

test('backgrounding and changing motion preference stop and resume real rendering', async ({
  page,
}) => {
  await page.addInitScript(trackUniverseFrames);
  await page.goto('/universe');
  await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'sun');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  const frames = () => page.evaluate(() => Reflect.get(window, 'universeFrames') as number);
  const initial = await frames();
  await expect.poll(frames).toBeGreaterThan(initial);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  const hidden = await frames();
  await page.waitForTimeout(200);
  expect(await frames()).toBe(hidden);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(frames).toBeGreaterThan(hidden);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: en.universe.pause })).toHaveCount(0);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  const reduced = await frames();
  await page.waitForTimeout(200);
  expect(await frames()).toBe(reduced);
  await page.getByRole('button', { name: 'Earth', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'earth');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.getByRole('button', { name: en.universe.pause })).toBeVisible();
  await expect.poll(frames).toBeGreaterThan(reduced);
});
