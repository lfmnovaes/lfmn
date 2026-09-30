import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://data-api.binance.vision/**', (route) => route.abort());
  await page.routeWebSocket('wss://data-stream.binance.vision/**', (socket) => socket.close());
});

test('technology names and local SVGs survive both palettes, languages, and narrow layouts', async ({
  page,
  request,
}) => {
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
