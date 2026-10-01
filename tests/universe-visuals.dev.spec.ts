import { expect, test } from '@playwright/test';

import en from '../src/messages/en.json';

const copy = en.universe;

test('desktop bloom renders real passes and releases its targets on a smaller viewport', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    // Exercise the hardware quality branch on CI's software GPU; WebGL itself remains real.
    const parameter = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (name) {
      return name === 0x9246 ? 'Desktop validation renderer' : parameter.call(this, name);
    };
    let targets = 0;
    const create = WebGL2RenderingContext.prototype.createFramebuffer;
    const remove = WebGL2RenderingContext.prototype.deleteFramebuffer;
    WebGL2RenderingContext.prototype.createFramebuffer = function () {
      const target = create.call(this);
      if (target) targets++;
      return target;
    };
    WebGL2RenderingContext.prototype.deleteFramebuffer = function (target) {
      if (target) targets--;
      remove.call(this, target);
    };
    Object.defineProperty(window, 'universeTargets', { get: () => targets });
  });
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.text().includes('THREE.Clock'))
      errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/universe-preview');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-effects', 'glow');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(canvas).toHaveAttribute('data-focused-planet', 'sun');
  const targets = () => page.evaluate(() => Reflect.get(window, 'universeTargets') as number);
  // The renderer owns its own framebuffers; only the composer's extra targets should disappear.
  const baseline = await targets();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(canvas).toHaveAttribute('data-effects', 'bloom');
  await expect.poll(targets).toBeGreaterThan(baseline);
  await canvas.screenshot({ path: testInfo.outputPath('universe-bloom.png') });
  await page.setViewportSize({ width: 390, height: 720 });
  await expect(canvas).toHaveAttribute('data-effects', 'glow');
  await expect.poll(targets).toBe(baseline);
  await expect(canvas).toHaveAttribute('data-focused-planet', 'sun');
  expect(errors).toEqual([]);
});

test('decorative assets load progressively and failed maps retain the scene and facts', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = 0;
  await page.route('**/textures/universe/*.webp', async (route) => {
    held++;
    await pending;
    if (route.request().url().endsWith('/neptune.webp')) await route.abort();
    else await route.continue();
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/universe-preview');
  try {
    await expect(page.getByRole('button', { name: copy.zoomIn, exact: true })).toBeEnabled();
    await expect.poll(() => held).toBe(12);
    await expect(page.getByRole('progressbar', { name: copy.loading })).toBeVisible();
    await page.getByRole('button', { name: 'Earth', exact: true }).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'earth');
    await page.getByRole('button', { name: copy.explore, exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText(copy.content.earth.description);
    await page.keyboard.press('Escape');
  } finally {
    release();
  }
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText(copy.textureFallback);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  const textured = await page.locator('canvas').screenshot();
  await page.unroute('**/textures/universe/*.webp');
  await page.route('**/textures/universe/*.webp', (route) => route.abort());
  await page.reload();
  await expect(page.getByRole('button', { name: copy.zoomIn, exact: true })).toBeEnabled();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText(copy.textureFallback);
  await page.getByRole('button', { name: 'Earth', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'earth');
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(await page.locator('canvas').screenshot()).not.toEqual(textured);
  await page.getByRole('button', { name: copy.explore, exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(copy.content.earth.description);
  expect(errors).toEqual([]);
});

test('mode and locale controls retain Universe, support browser history, and fit after resizing', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/universe-preview');
  await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'sun');
  await page.getByRole('button', { name: 'Saturn', exact: true }).click();
  for (const width of [320, 600, 900, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'saturn');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width);
    await expect(page.getByRole('button', { name: 'Normal', exact: true })).toBeVisible();
  }
  await page.getByRole('link', { name: 'PT', exact: true }).click();
  await expect(page).toHaveURL('/pt-BR/universe-preview');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('button', { name: 'Universo', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.getByRole('button', { name: 'Normal', exact: true }).click();
  await expect(page).toHaveURL('/pt-BR');
  await expect(page.locator('a[download]')).toHaveCount(2);
  await page.goBack();
  await expect(page).toHaveURL('/pt-BR/universe-preview');
  await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'sun');
  await page.getByRole('link', { name: 'EN', exact: true }).click();
  await expect(page).toHaveURL('/universe-preview');
  await expect(page.getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute(
    'href',
    'https://github.com/lfmnovaes',
  );
  await expect(page.getByRole('link', { name: 'GitHub', exact: true }).locator('svg')).toHaveCount(
    1,
  );
});

test('repeated mode entry releases WebGL contexts and keeps resident texture allocations bounded', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const contexts: { lost: boolean; textures: Set<WebGLTexture> }[] = [];
    const seen = new WeakMap<WebGL2RenderingContext, (typeof contexts)[number]>();
    const getContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value(this: HTMLCanvasElement, ...args: unknown[]) {
        const context = Reflect.apply(getContext, this, args);
        if (context instanceof WebGL2RenderingContext && !seen.has(context)) {
          const state = { lost: false, textures: new Set<WebGLTexture>() };
          contexts.push(state);
          seen.set(context, state);
          this.addEventListener('webglcontextlost', () => {
            state.lost = true;
          });
        }
        return context;
      },
    });
    const create = WebGL2RenderingContext.prototype.createTexture;
    WebGL2RenderingContext.prototype.createTexture = function () {
      const texture = create.call(this);
      if (texture) seen.get(this)?.textures.add(texture);
      return texture;
    };
    const remove = WebGL2RenderingContext.prototype.deleteTexture;
    WebGL2RenderingContext.prototype.deleteTexture = function (texture) {
      if (texture) seen.get(this)?.textures.delete(texture);
      remove.call(this, texture);
    };
    Object.defineProperty(window, 'universeResources', {
      get: () => ({
        contexts: contexts.filter((context) => !context.lost).length,
        textures: contexts
          .filter((context) => !context.lost)
          .reduce((total, context) => total + context.textures.size, 0),
      }),
    });
  });
  await page.goto('/');
  const resources = () =>
    page.evaluate(
      () => Reflect.get(window, 'universeResources') as { contexts: number; textures: number },
    );
  const allocations: number[] = [];
  for (let entry = 0; entry < 3; entry++) {
    await page.getByRole('button', { name: 'Universe', exact: true }).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'sun');
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await expect.poll(async () => (await resources()).contexts).toBe(1);
    const current = await resources();
    // Three uploads only maps for visible meshes; loaded images need not all be GPU-resident.
    expect(current.textures).toBeGreaterThan(0);
    expect(current.textures).toBeLessThan(40);
    allocations.push(current.textures);
    await page.getByRole('button', { name: 'Normal', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect.poll(resources).toEqual({ contexts: 0, textures: 0 });
  }
  expect(new Set(allocations).size).toBe(1);
});
