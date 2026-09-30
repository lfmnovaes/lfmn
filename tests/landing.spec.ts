import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://data-api.binance.vision/**', (route) => route.abort());
  await page.routeWebSocket('wss://data-stream.binance.vision/**', (socket) => socket.close());
});

for (const locale of ['en', 'pt-BR']) {
  test(`${locale}: profile, WIP mode, exactly two résumé downloads, and both palettes are accessible`, async ({
    page,
    request,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(locale === 'en' ? '/' : '/pt-BR');
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('.display-name')).toHaveText('Luis Fernando');
    for (const wordmark of await page.locator('.wordmark').all()) {
      await expect(wordmark).toHaveText('lfmn');
    }
    await expect(page.getByTestId('portrait-stage')).toBeVisible();
    await expect(page.getByTestId('role-text')).toHaveText(
      locale === 'en' ? 'Full-Stack Developer' : 'Desenvolvedor Full Stack',
    );
    await expect(page.locator('.portrait-badges li')).toHaveCount(6);
    await expect(page.locator('.hero-position')).toHaveText(
      locale === 'en' ? '6+ years of experience' : '6+ anos de experiência',
    );
    await expect(
      page.locator('.hero-actions, .hero-bottom, .location-note, .about-grid'),
    ).toHaveCount(0);
    await expect(page.locator('a[href^="#"]')).toHaveCount(0);
    expect(await page.locator('.hero-description').innerText()).not.toMatch(/[—–-]/);
    await expect(page.locator('.motion-button')).toHaveCount(0);
    await expect(page.locator('a[download]')).toHaveCount(2);
    await expect(page.locator('.resume-downloads a')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Normal', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const wip = page.getByRole('button', {
      name: locale === 'en' ? 'Universe — Work in progress' : 'Universo — Em desenvolvimento',
    });
    await expect(wip).toHaveAttribute('aria-disabled', 'true');
    await wip.focus();
    await expect(page.getByRole('tooltip')).toContainText(
      locale === 'en' ? 'Work in progress' : 'Em desenvolvimento',
    );
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    const audit = async () => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    };
    await audit();
    await page
      .getByRole('button', { name: locale === 'en' ? 'Turn the lights on' : 'Acender as luzes' })
      .click();
    await expect(page.locator('.site-shell')).toHaveAttribute('data-lights', 'on');
    await audit();
    await page
      .getByRole('button', { name: locale === 'en' ? 'Turn the lights off' : 'Apagar as luzes' })
      .click();
    await expect(page.locator('.site-shell')).toHaveAttribute('data-lights', 'off');
    for (const language of ['en', 'pt-BR']) {
      const link = page.locator(`a[href="/resumes/luis-fernando-${language}.pdf"]`);
      await expect(link).toHaveAttribute('lang', language);
      await expect(link.locator('.country-flag')).toHaveAttribute('aria-hidden', 'true');
      const pdf = await request.get(`/resumes/luis-fernando-${language}.pdf`);
      expect(pdf.ok()).toBe(true);
      expect(pdf.headers()['content-type']).toContain('application/pdf');
      expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');
    }
    const downloadPromise = page.waitForEvent('download');
    await page.locator('a[href="/resumes/luis-fernando-en.pdf"]').click();
    expect((await downloadPromise).suggestedFilename()).toBe('luis-fernando-en.pdf');
    expect(errors).toEqual([]);
  });
}

test('role starts automatically, holds for four seconds, and erases fully', async ({ page }) => {
  const start = new Date('2026-09-30T12:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
  await page.goto('/');
  await expect(page.locator('[data-motion]')).toHaveAttribute('data-motion', 'on');
  await page.clock.runFor(1500);
  await expect(page.getByTestId('role-text')).toHaveText('Full-Stack Developer');
  const fullWidth = (await page.locator('.role-frame').boundingBox())?.width ?? 0;
  const fullHeight = (await page.locator('.role-frame').boundingBox())?.height ?? 0;
  await page.clock.runFor(3600);
  await expect(page.getByTestId('role-text')).toHaveText('Full-Stack Developer');
  await page.clock.runFor(850);
  await expect(page.getByTestId('role-text')).toHaveText('');
  expect((await page.locator('.role-frame').boundingBox())?.width).toBeLessThan(fullWidth / 2);
  expect((await page.locator('.role-frame').boundingBox())?.height).toBe(fullHeight);
  await page.clock.runFor(1400);
  await expect(page.getByTestId('role-text')).toHaveText('Software Engineer');
  await expect(page.locator('.motion-button')).toHaveCount(0);
});

test('critical profile and both downloads work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3100/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Luis Fernando');
    await expect(
      page.locator('.site-header').getByRole('link', { name: 'GitHub', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('MyCareforce', { exact: true })).toBeVisible();
    await expect(page.locator('.resume-downloads a[download]')).toHaveCount(2);
    await expect(page.getByTestId('role-text')).toHaveText('Full-Stack Developer');
    await expect(page.locator('.technology-group:not([aria-hidden]) li')).toHaveCount(26);
    await expect(page.locator('.technology-group').first()).toHaveCSS('display', 'grid');
    await page.getByRole('link', { name: 'PT', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(
      page.locator('.contact-socials').getByRole('link', { name: 'Diga olá' }),
    ).toBeVisible();
    await expect(page.locator('a[download]')).toHaveCount(2);
  } finally {
    await context.close();
  }
});

test('unavailable decorative assets do not block profile or contact', async ({ page }) => {
  await page.route('**/mesh*.svg', (route) => route.abort());
  await page.route('**/*.woff2', (route) => route.abort());
  await page.route('**/technologies/*.svg', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Luis Fernando');
  await expect(
    page.locator('.contact-socials').getByRole('link', { name: 'Say hello' }),
  ).toBeVisible();
  await expect(page.locator('a[download]')).toHaveCount(2);
  await expect(page.locator('.hero')).not.toHaveAttribute('aria-busy', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.technology-section').scrollIntoViewIfNeeded();
  await expect(
    page.locator('.technology-group:not([aria-hidden])').getByText('React', { exact: true }),
  ).toBeVisible();
});

test('magnetic badges return and the mesh follows the pointer with gentler reduced motion', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Magnetic effects are deliberately mouse-only.');
  await page.goto('/');
  const anchor = page.locator('.badge-anchor').first();
  await anchor.scrollIntoViewIfNeeded();
  const rect = await anchor.boundingBox();
  if (!rect) throw new Error('Portrait badge has no layout box');
  await page.mouse.move(rect.x + rect.width / 2 + 50, rect.y + rect.height / 2);
  await expect
    .poll(() =>
      anchor.evaluate((node) => Number.parseFloat(node.style.getPropertyValue('--magnet-x'))),
    )
    .toBeGreaterThan(0);
  await expect(page.locator('.site-shell')).toHaveAttribute('data-pointer', 'on');
  await expect(anchor.locator('.badge-face')).toHaveCSS('animation-play-state', 'paused');
  await page.mouse.move(
    page.viewportSize()?.width ?? 1200,
    (page.viewportSize()?.height ?? 800) - 4,
  );
  await expect
    .poll(() => anchor.evaluate((node) => node.style.getPropertyValue('--magnet-x')))
    .toBe('0px');
  await expect(anchor).toHaveAttribute('data-magnetic', 'off');
  await expect(anchor.locator('.badge-face')).toHaveCSS('animation-play-state', 'running');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(rect.x + 30, rect.y + 20);
  await expect(page.locator('.site-shell')).toHaveAttribute('data-pointer', 'on');
  await expect(anchor).toHaveAttribute('data-magnetic', 'on');
  expect(
    Math.abs(
      await anchor.evaluate((node) => Number.parseFloat(node.style.getPropertyValue('--magnet-x'))),
    ),
  ).toBeLessThanOrEqual(8);
});

test('native lights reveal, sticky header, language routes, and keyboard skip work', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Turn the lights on' }).click();
  await expect(page.locator('.site-shell')).toHaveAttribute('data-lights', 'on');
  await page.getByRole('button', { name: 'Turn the lights off' }).click();
  await expect(page.locator('.site-shell')).toHaveAttribute('data-lights', 'off');
  await expect(page.locator('a[href^="#"]')).toHaveCount(0);
  await expect(page.locator('.site-header nav')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Curiosity drives me. Craft keeps me going.' }),
  ).toHaveCount(0);
  await page.locator('.experience-section').scrollIntoViewIfNeeded();
  await expect(page.locator('.site-shell')).toHaveAttribute('data-scrolled', 'true');
  await page.getByRole('link', { name: 'PT', exact: true }).click();
  await expect(page).toHaveURL(/\/pt-BR$/);
  const skip = page.getByRole('button', { name: 'Ir para o conteúdo', exact: true });
  await skip.focus();
  await skip.click();
  await expect(page.locator('main')).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  expect(errors).toEqual([]);
});

test('the mesh visibly reveals color under the pointer in both motion preferences', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The mesh spotlight follows a mouse, not touch.');
  await page.goto('/');
  await page.getByRole('button', { name: 'Turn the lights on' }).click();
  await expect(page.locator('.site-shell')).toHaveAttribute('data-lights', 'on');
  await page.getByRole('button', { name: 'Turn the lights off' }).click();
  await expect(page.locator('.site-shell')).toHaveAttribute('data-lights', 'off');
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    await page.emulateMedia({ reducedMotion });
    await page.mouse.move(1, 1);
    await expect(page.locator('.mesh-spotlight')).toHaveCSS(
      'opacity',
      reducedMotion === 'reduce' ? '0.65' : '0.9',
    );
    const clip = { x: 0, y: 270, width: 40, height: 60 };
    const before = await page.screenshot({ clip });
    await page.mouse.move(20, 299);
    await expect
      .poll(() =>
        page.locator('.site-shell').evaluate((node) => node.style.getPropertyValue('--pointer-y')),
      )
      .toBe('299px');
    expect((await page.screenshot({ clip })).equals(before)).toBe(false);
  }
});

test('résumé ripples expand from the click, clean up, and center for keyboard activation', async ({
  page,
}) => {
  await page.goto('/');
  const link = page.locator('.resume-download').first();
  await link.scrollIntoViewIfNeeded();
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    await page.emulateMedia({ reducedMotion });
    const download = page.waitForEvent('download');
    await link.click({ position: { x: 24, y: 18 } });
    await download;
    const ripple = link.locator('.button-ripple');
    const origin = await ripple.evaluate((node) => ({
      x: Number.parseFloat(node.style.left),
      y: Number.parseFloat(node.style.top),
    }));
    // Browser clicks round client coordinates; layout positions can be fractional.
    expect(Math.abs(origin.x - 24)).toBeLessThan(1);
    expect(Math.abs(origin.y - 18)).toBeLessThan(1);
    await expect(ripple).toHaveCSS(
      'animation-duration',
      reducedMotion === 'reduce' ? '0.9s' : '0.65s',
    );
    const width = (await ripple.boundingBox())?.width ?? 0;
    await expect.poll(async () => (await ripple.boundingBox())?.width ?? 0).toBeGreaterThan(width);
    await expect(ripple).toHaveCount(0);
  }
  await link.focus();
  const download = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  await download;
  const size = await link.evaluate((node) => ({
    width: node.clientWidth,
    height: node.clientHeight,
  }));
  const position = await link.locator('.button-ripple').evaluate((node) => ({
    x: Number.parseFloat(node.style.left),
    y: Number.parseFloat(node.style.top),
  }));
  expect(position.x).toBeCloseTo(size.width / 2);
  expect(position.y).toBeCloseTo(size.height / 2);
  await expect(link.locator('.button-ripple')).toHaveCount(0);
});
