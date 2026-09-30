import { expect, test } from '@playwright/test';

test('development loads both locales, styles, fonts, and the hot-reload connection', async ({
  page,
}) => {
  const errors: string[] = [];
  let hotReloadConnected = false;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`);
  });
  page.on('websocket', (socket) => {
    if (new URL(socket.url()).pathname !== '/_next/hmr') return;
    socket.on('framereceived', () => {
      hotReloadConnected = true;
    });
    socket.on('socketerror', (error) => errors.push(error));
  });

  for (const [path, locale] of [
    ['/', 'en'],
    ['/pt-BR', 'pt-BR'],
  ]) {
    hotReloadConnected = false;
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Luis');
    await expect(page.getByTestId('portrait-stage')).toBeVisible();
    await expect(page.locator('.technology-group:not([aria-hidden]) li')).toHaveCount(26);
    await expect(page.locator('.site-shell')).toHaveCSS('background-color', 'rgb(9, 10, 14)');
    expect(
      await page.evaluate(async () => {
        await document.fonts.ready;
        return ['--font-geist', '--font-display'].every((variable) => {
          const family = getComputedStyle(document.documentElement)
            .getPropertyValue(variable)
            .split(',')[0]
            .replaceAll('"', '')
            .trim();
          return [...document.fonts].some(
            (font) => font.family === family && font.status === 'loaded',
          );
        });
      }),
    ).toBe(true);
    await expect.poll(() => hotReloadConnected).toBe(true);
    await page.reload();
    await expect(page.getByTestId('portrait-stage')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
