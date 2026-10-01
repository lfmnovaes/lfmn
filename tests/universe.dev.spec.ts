import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import en from '../src/messages/en.json';
import pt from '../src/messages/pt-BR.json';

for (const [locale, copy] of [
  ['en', en],
  ['pt-BR', pt],
] as const) {
  const path = locale === 'en' ? '/universe-preview' : '/pt-BR/universe-preview';

  test(`${locale}: scene loads on request and every body supports selection and camera focus`, async ({
    page,
  }) => {
    const requests: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'warning' && message.text().includes('THREE.Clock'))
        errors.push(message.text());
    });
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(
      requests.some((url) => /node_modules_three|node_modules_@react-three_fiber/.test(url)),
    ).toBe(false);
    await expect(page.locator('a[download]')).toHaveCount(2);
    await page.getByRole('button', { name: copy.universe.enter, exact: true }).click();
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
    }
    await page.getByRole('button', { name: copy.universe.bodies.sun, exact: true }).focus();
    await page.keyboard.press('ArrowRight');
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
    await page.getByRole('link', { name: copy.universe.returnNormal, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Luis');
    await expect(page.locator('a[download]')).toHaveCount(2);
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
    await page.getByRole('button', { name: copy.universe.enter, exact: true }).click();
    await expect(page.getByRole('status')).toHaveText(copy.universe.unavailable);
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: copy.universe.zoomIn, exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: copy.universe.bodies.jupiter, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('MyCareforce');
    await expect(page.getByRole('region', { name: 'MyCareforce' })).toContainText(
      copy.experience.items[0].body,
    );
  });
}

test('loading reflects pending renderer chunks and a failed import preserves the portfolio controls', async ({
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
  await page.goto('/universe-preview');
  expect(held).toBe(0);
  await page.getByRole('button', { name: en.universe.enter, exact: true }).click();
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
  await page.reload();
  await page.unroute('**/_next/static/chunks/node_modules_three_*');
  await page.route('**/_next/static/chunks/node_modules_three_*', (route) => route.abort());
  await page.getByRole('button', { name: en.universe.enter, exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(en.universe.unavailable);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page.getByRole('button', { name: 'Jupiter', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('MyCareforce');
});

test('canvas pointer selection has the same DOM result as keyboard selection', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/universe-preview');
  await page.getByRole('button', { name: en.universe.enter, exact: true }).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-focused-planet', 'sun');
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
    // The primitive Sun is the bright yellow body; use its rendered center.
    for (let index = 0; index < pixels.length; index += 4) {
      const [red, green, blue] = pixels.slice(index, index + 3);
      if (red > 180 && green > red * 0.65 && blue < red * 0.62) {
        x += (index / 4) % image.width;
        y += Math.floor(index / 4 / image.width);
        count++;
      }
    }
    if (!count) throw new Error('Sun is not visible');
    return { x: x / count / image.width, y: y / count / image.height };
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
  await page.addInitScript(() => {
    let frames = 0;
    const clear = WebGL2RenderingContext.prototype.clear;
    WebGL2RenderingContext.prototype.clear = function (mask: number) {
      frames++;
      return clear.call(this, mask);
    };
    Object.defineProperty(window, 'universeFrames', { get: () => frames });
  });
  await page.goto('/universe-preview');
  await page.getByRole('button', { name: en.universe.enter, exact: true }).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-focused-planet', 'sun');
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

test('preview introduction and its two downloads remain readable without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto('/universe-preview');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Luis Fernando');
    await expect(page.locator('a[download]')).toHaveCount(2);
    await expect(page.getByRole('button', { name: en.universe.enter, exact: true })).toBeHidden();
    await expect(page.locator('noscript p')).toHaveText(en.universe.noJavaScript);
    await expect(page.locator('noscript p')).toBeVisible();
    await expect(
      page.getByRole('link', { name: en.universe.returnNormal, exact: true }),
    ).toHaveAttribute('href', '/');
  } finally {
    await context.close();
  }
});
