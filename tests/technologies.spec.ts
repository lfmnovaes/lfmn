import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://data-api.binance.vision/**', (route) => route.abort());
  await page.routeWebSocket('wss://data-stream.binance.vision/**', (socket) => socket.close());
});

test('technology names and local SVGs survive both palettes, languages, and narrow layouts', async ({
  page,
  request,
}) => {
  // Both locales inspect 26 lazy-loaded images and their HTTP responses.
  test.setTimeout(60_000);
  for (const [path, title] of [
    ['/', 'From interface to infrastructure.'],
    ['/pt-BR', 'Da interface à infraestrutura.'],
  ]) {
    await page.goto(path);
    await page.addStyleTag({
      content:
        '.technology-section .technology-track {animation:none;transform:none;display:block;width:auto} .technology-section .technology-group {display:grid;padding-right:0} .technology-section .technology-card {width:auto} .technology-section .technology-duplicate {display:none} .technology-section .technology-viewport::before,.technology-section .technology-viewport::after {display:none}',
    });
    const strip = page.getByRole('region', { name: title, exact: true });
    await strip.scrollIntoViewIfNeeded();
    const primary = strip.locator('.technology-group:not([aria-hidden])');
    await expect(primary.locator('li')).toHaveCount(26);
    await expect(primary.getByText('React Native', { exact: true })).toBeVisible();
    await expect(primary.getByText('ASP.NET', { exact: true })).toBeVisible();
    await expect(primary.getByText('RSpec', { exact: true })).toBeVisible();
    await expect(strip.locator('.technology-duplicate')).toHaveCount(3);
    for (const clone of await strip.locator('.technology-duplicate').all()) {
      await expect(clone).toBeHidden();
      await expect(clone).toHaveAttribute('aria-hidden', 'true');
    }
    for (const image of await primary.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
      const src = await image.getAttribute('src');
      expect(src).toMatch(/^\/technologies\/[a-z0-9-]+\.svg$/);
      const response = await request.get(src ?? '');
      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toContain('image/svg+xml');
      const body = await response.text();
      expect(body).toContain('viewBox=');
      expect(body).toContain('<title>');
      expect(body).not.toMatch(/<(?:image|script|foreignObject)\b/);
      await expect(image).toHaveAttribute('alt', '');
      await expect(image).toHaveCSS('width', '52px');
      await expect(image).toHaveCSS('height', '52px');
    }
    await page
      .getByRole('button', { name: path === '/' ? 'Turn the lights on' : 'Acender as luzes' })
      .click();
    await expect(page.locator('.site-shell')).toHaveAttribute('data-lights', 'on');
    await expect(primary.getByText('PostgreSQL', { exact: true })).toBeVisible();
  }
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.locator('.technology-group:not([aria-hidden]) li')).toHaveCount(26);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('marquees animate automatically, pause on hover/focus, and adapt to reduced motion', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('[data-motion]')).toHaveAttribute('data-motion', 'on');
  const rows = page.locator('.technology-viewport');
  await rows.first().scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const [index, duration, direction] of [
    [0, '40s', 'normal'],
    [1, '50s', 'reverse'],
    [2, '45s', 'normal'],
  ] as const) {
    const track = rows.nth(index).locator('.technology-track');
    await expect(track).toHaveCSS('animation-duration', duration);
    await expect(track).toHaveCSS('animation-direction', direction);
    expect(
      await track.evaluate((node) => {
        const [first, second] = node.children;
        return (
          Math.abs(first.getBoundingClientRect().width - second.getBoundingClientRect().width) <
            0.1 &&
          Math.abs(node.getBoundingClientRect().width - first.getBoundingClientRect().width * 2) <
            0.1
        );
      }),
    ).toBe(true);
  }
  const first = rows.first();
  const track = first.locator('.technology-track');
  if (!isMobile) {
    await first.hover();
    await expect(track).toHaveCSS('animation-play-state', 'paused');
    const card = first.locator('.technology-card').filter({ hasText: 'TypeScript' }).first();
    await page.mouse.move(0, 0);
    await first.focus();
    const width = (await card.boundingBox())?.width ?? 0;
    await card.hover();
    await expect.poll(async () => (await card.boundingBox())?.width ?? 0).toBeGreaterThan(width);
    await expect
      .poll(async () => (await card.locator('img').boundingBox())?.width ?? 0)
      .toBeGreaterThan(52);
    await page.mouse.move(0, 0);
    await first.evaluate((node) => (node as HTMLElement).blur());
    await expect(track).toHaveCSS('animation-play-state', 'running');
  }
  await first.focus();
  await expect(first).toBeFocused();
  await expect(track).toHaveCSS('animation-play-state', 'paused');
  await page.keyboard.press('Tab');
  await expect(rows.nth(1)).toBeFocused();
  await expect(track).toHaveCSS('animation-play-state', 'running');
  const transform = await track.evaluate((node) => getComputedStyle(node).transform);
  await expect
    .poll(() => track.evaluate((node) => getComputedStyle(node).transform))
    .not.toBe(transform);
  await expect(page.locator('.motion-button')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(track).toHaveCSS('animation-name', 'technology-scroll');
  await expect(track).toHaveCSS('animation-duration', '150s');
  await expect(first.locator('.technology-group').first()).toHaveCSS('display', 'flex');
  await expect(first.locator('.technology-duplicate')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(track).toHaveCSS('animation-name', 'technology-scroll');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(track).toHaveCSS('animation-name', 'technology-scroll');
  await expect(first.locator('.technology-group').first()).toHaveCSS('display', 'flex');
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('each carousel can be dragged both ways, wraps continuously, and supports arrow keys', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  const rows = page.locator('.technology-viewport');
  for (const row of await rows.all()) {
    await row.scrollIntoViewIfNeeded();
    await row.focus();
    await expect(row).toHaveCSS('cursor', 'grab');
    await expect(row).toHaveCSS('touch-action', 'pan-y pinch-zoom');
    const track = row.locator('.technology-track');
    await track.evaluate((node) => {
      const animation = node.getAnimations()[0];
      animation.currentTime = Number(animation.effect?.getTiming().duration) / 2;
    });
    const position = () =>
      track.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41);
    const rect = await row.boundingBox();
    if (!rect) throw new Error('Carousel must have bounds');
    const x = rect.x + 45;
    const y = rect.y + rect.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await expect(row).toHaveAttribute('data-dragging', 'true');
    await expect(row).toHaveCSS('cursor', 'grabbing');
    const start = await position();
    await page.mouse.move(x + 120, y, { steps: 5 });
    await expect.poll(position).toBeCloseTo(start + 120, 0);
    await page.mouse.move(x - 30, y, { steps: 5 });
    await expect.poll(position).toBeCloseTo(start - 30, 0);
    await row.dispatchEvent('pointermove', { isPrimary: true, clientX: x + 10000, clientY: y });
    const wrapped = await track.evaluate((node) => {
      const animation = node.getAnimations()[0];
      return {
        time: Number(animation.currentTime),
        duration: Number(animation.effect?.getTiming().duration),
        width: node.firstElementChild?.getBoundingClientRect().width ?? 0,
      };
    });
    expect(wrapped.time).toBeGreaterThanOrEqual(0);
    expect(wrapped.time).toBeLessThan(wrapped.duration);
    expect(await position()).toBeGreaterThanOrEqual(-wrapped.width);
    expect(await position()).toBeLessThanOrEqual(0);
    await page.mouse.up();
    await expect(row).not.toHaveAttribute('data-dragging', 'true');
    await expect(row).toHaveCSS('cursor', 'grab');
    await track.evaluate((node) => {
      const animation = node.getAnimations()[0];
      animation.currentTime = Number(animation.effect?.getTiming().duration) / 2;
    });
    const initial = await position();
    await page.keyboard.press('ArrowRight');
    await expect.poll(position).toBeCloseTo(initial - 168, 0);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(position).toBeCloseTo(initial, 0);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await row.dispatchEvent('pointercancel');
    await expect(row).not.toHaveAttribute('data-dragging', 'true');
    await page.mouse.up();
    await page.mouse.move(0, 0);
    await row.evaluate((node) => (node as HTMLElement).blur());
    await expect(track).toHaveCSS('animation-play-state', 'running');
  }
  if (isMobile) {
    const session = await page.context().newCDPSession(page);
    const row = rows.first();
    await row.scrollIntoViewIfNeeded();
    await row.focus();
    const track = row.locator('.technology-track');
    await track.evaluate((node) => {
      const animation = node.getAnimations()[0];
      animation.currentTime = Number(animation.effect?.getTiming().duration) / 2;
    });
    const rect = await row.boundingBox();
    if (!rect) throw new Error('Touch carousel must have bounds');
    const x = rect.x + rect.width * 0.65;
    const y = rect.y + rect.height / 2;
    const position = () =>
      track.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41);
    const start = await position();
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await expect(row).toHaveAttribute('data-dragging', 'true');
    for (let step = 1; step <= 6; step++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x - step * 20, y }],
      });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(row).not.toHaveAttribute('data-dragging', 'true');
    await expect.poll(position).toBeCloseTo(start - 120, 0);
    const scroll = await page.evaluate(() => scrollY);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 5; step++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y - step * 30 }],
      });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(row).not.toHaveAttribute('data-dragging', 'true');
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scroll);
    await session.detach();
  }
});
