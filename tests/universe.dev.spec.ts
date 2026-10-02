import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import en from '../src/messages/en.json';
import pt from '../src/messages/pt-BR.json';
import { trackUniverseFrames } from './universe-fixtures';

for (const [locale, copy] of [
  ['en', en],
  ['pt-BR', pt],
] as const) {
  const path = locale === 'en' ? '/universe' : '/pt-BR/universe';

  test(`${locale}: scene loads automatically and every body supports selection and camera focus`, async ({
    page,
  }) => {
    const errors: string[] = [];
    const clockWarnings: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
      if (message.text().includes('THREE.Clock')) clockWarnings.push(message.text());
    });
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('a[download]')).toHaveCount(0);
    const canvas = page.locator('canvas');
    await expect(
      page.getByRole('button', { name: copy.universe.zoomIn, exact: true }),
    ).toBeEnabled();
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await page.getByRole('button', { name: copy.universe.pause, exact: true }).click();
    await expect(
      page.getByRole('button', { name: copy.universe.resume, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: copy.universe.resume, exact: true }).click();

    const bodies = Object.entries(copy.universe.bodies);
    for (const [id, name] of bodies) {
      const button = page.getByRole('button', { name, exact: true });
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(
        page
          .getByRole('group', { name: copy.universe.planetNavigation })
          .locator('[aria-pressed="true"]'),
      ).toHaveCount(1);
      await expect(canvas).toHaveAttribute('data-focused-planet', id);
      await expect(page.getByRole('meter', { name: copy.universe.position })).toHaveAttribute(
        'aria-valuetext',
        name,
      );
    }
    for (const name of [
      copy.universe.bodies.earth,
      copy.universe.bodies.neptune,
      copy.universe.bodies.venus,
    ])
      await page.getByRole('button', { name, exact: true }).click();
    await expect(canvas).toHaveAttribute('data-focused-planet', 'venus');
    await page.getByRole('button', { name: copy.universe.bodies.sun, exact: true }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(
      page.getByRole('button', { name: copy.universe.bodies.mercury, exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Space');
    await expect(canvas).toHaveAttribute('data-focused-planet', 'mercury');
    await expect(page.locator('a[download]')).toHaveCount(0);
    await page.getByRole('button', { name: copy.universe.zoomIn, exact: true }).click();
    await expect(canvas).toHaveAttribute('data-focused-planet', 'mercury');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    expect(errors).toEqual([]);
    expect(clockWarnings).toEqual([]);
    await page.getByRole('link', { name: copy.nav.normal, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Luis');
    await expect(page.locator('a[download]')).toHaveCount(2);
  });

  test(`${locale}: every body has sourced facts and an accessible reading panel`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await expect(
      page.getByRole('button', { name: copy.universe.zoomIn, exact: true }),
    ).toBeEnabled();
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    for (const [id, name] of Object.entries(copy.universe.bodies)) {
      await page.getByRole('button', { name, exact: true }).click();
      await page.getByRole('button', { name: copy.universe.explore, exact: true }).click();
      const dialog = page.getByRole('dialog', { name, exact: true });
      const content = copy.universe.content[id as keyof typeof copy.universe.content];
      await expect(dialog).toContainText(content.description);
      for (const fact of content.facts) await expect(dialog).toContainText(fact.value);
      await expect(dialog.getByRole('link', { name: copy.universe.source })).toHaveAttribute(
        'href',
        /^https:\/\/science\.nasa\.gov\//,
      );
      if (id === 'pluto') {
        const close = dialog.getByRole('button', { name: copy.universe.closeFacts });
        await close.focus();
        await page.keyboard.press('Tab');
        await expect(dialog.getByRole('link')).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(close).toBeFocused();
        const factsAudit = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(factsAudit.violations).toEqual([]);
      }
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole('button', { name: copy.universe.explore })).toBeFocused();
    }
  });

  test(`${locale}: missing WebGL retains readable summaries and navigation`, async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
          return type === 'webgl2' ? null : Reflect.apply(original, this, [type, ...args]);
        },
      });
    });
    await page.goto(path);
    await expect(page.getByRole('status')).toHaveText(copy.universe.unavailable);
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: copy.universe.zoomIn, exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: copy.universe.bodies.jupiter, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.universe.bodies.jupiter);
    await expect(page.getByRole('region', { name: copy.universe.bodies.jupiter })).toContainText(
      copy.universe.content.jupiter.summary,
    );
  });
}

test('loading reflects pending renderer chunks and a failed import preserves the facts and controls', async ({
  page,
}) => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = 0;
  await page.route('**/_next/static/chunks/node_modules_three_*', async (route) => {
    held++;
    await pending;
    await route.continue();
  });
  await page.goto('/universe');
  try {
    await expect.poll(() => held).toBeGreaterThan(0);
    await expect(page.getByRole('progressbar', { name: en.universe.loading })).toBeVisible();
    await expect(
      page.getByRole('button', { name: en.universe.zoomIn, exact: true }),
    ).toBeDisabled();
  } finally {
    release();
  }
  await expect(page.getByRole('button', { name: en.universe.zoomIn, exact: true })).toBeEnabled();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page.unroute('**/_next/static/chunks/node_modules_three_*');
  await page.route('**/_next/static/chunks/node_modules_three_*', (route) => route.abort());
  await page.reload();
  await expect(page.getByRole('status')).toHaveText(en.universe.unavailable);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page.getByRole('button', { name: 'Jupiter', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.universe.bodies.jupiter);
});

test('canvas pointer selection has the same DOM result as keyboard selection', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/universe');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-focused-planet', 'sun');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mercury', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-focused-planet', 'mercury');
  for (let index = 0; index < 5; index++)
    await page.getByRole('button', { name: en.universe.zoomOut, exact: true }).click();
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  const screenshot = await canvas.screenshot();
  const sun = await page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const element = document.createElement('canvas');
    element.width = image.width;
    element.height = image.height;
    const context = element.getContext('2d');
    if (!context) throw new Error('Cannot inspect rendered pixels');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    let x = 0,
      y = 0,
      count = 0;
    // The Sun is the bright yellow body; use its rendered center.
    for (let index = 0; index < pixels.length; index += 4) {
      const [red, green, blue] = pixels.slice(index, index + 3);
      if (red > 180 && green > red * 0.65 && blue < red * 0.62) {
        x += (index / 4) % image.width;
        y += Math.floor(index / 4 / image.width);
        count++;
      }
    }
    if (!count) throw new Error('Sun is not visible');
    const center = { x: x / count, y: y / count };
    const scene = document.querySelector('canvas');
    if (!scene) throw new Error('Missing scene');
    const bounds = scene.getBoundingClientRect();
    let nearest: { x: number; y: number } | undefined;
    let closest = Infinity;
    // The full-screen canvas sits behind the HUD. Click a visible Sun pixel, not covered text.
    for (let index = 0; index < pixels.length; index += 64) {
      const [red, green, blue] = pixels.slice(index, index + 3);
      if (red <= 180 || green <= red * 0.65 || blue >= red * 0.62) continue;
      const px = (index / 4) % image.width;
      const py = Math.floor(index / 4 / image.width);
      const distance = Math.hypot(px - center.x, py - center.y);
      if (
        distance < closest &&
        document.elementFromPoint(
          bounds.x + (px / image.width) * bounds.width,
          bounds.y + (py / image.height) * bounds.height,
        ) === scene
      ) {
        nearest = { x: px / image.width, y: py / image.height };
        closest = distance;
      }
    }
    if (!nearest) throw new Error('No unobstructed Sun pixel');
    return nearest;
  }, screenshot.toString('base64'));
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;
  await canvas.click({ position: { x: sun.x * bounds.width, y: sun.y * bounds.height } });
  await expect(page.getByRole('button', { name: 'Sun', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('reduced motion stops rendering between direct focus and zoom changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(trackUniverseFrames);
  await page.goto('/universe');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-focused-planet', 'sun');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByRole('button', { name: en.universe.zoomIn, exact: true })).toBeEnabled();
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await page.clock.install();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
  const frames = () => page.evaluate(() => Reflect.get(window, 'universeFrames') as number);
  const before = await frames();
  await page.clock.runFor(1000);
  expect(await frames()).toBe(before);
  await page.getByRole('button', { name: 'Earth', exact: true }).click();
  await page.clock.runFor(50);
  await expect(canvas).toHaveAttribute('data-focused-planet', 'earth');
  const focused = await frames();
  expect(focused).toBeGreaterThan(before);
  await page.getByRole('button', { name: en.universe.zoomIn, exact: true }).click();
  await page.clock.runFor(50);
  expect(await frames()).toBeGreaterThan(focused);
  const zoomed = await frames();
  await page.clock.runFor(1000);
  expect(await frames()).toBe(zoomed);
});

test('all bodies have readable facts without JavaScript and Universe has no downloads', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto('/universe');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.universe.bodies.sun);
    await expect(page.locator('a[download]')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toBeHidden();
    await expect(page.getByRole('status')).toHaveText(en.universe.noJavaScript);
    await expect(page.getByRole('status')).toBeVisible();
    for (const [index, id] of Object.keys(en.universe.bodies).entries()) {
      await page.locator('noscript details').nth(index).locator('summary').click();
      await expect(page.locator('noscript details[open]').last()).toContainText(
        en.universe.content[id as keyof typeof en.universe.content].description,
      );
    }
    await expect(page.getByRole('link', { name: en.nav.normal, exact: true })).toHaveAttribute(
      'href',
      '/',
    );
  } finally {
    await context.close();
  }
});
