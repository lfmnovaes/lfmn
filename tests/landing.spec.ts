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

test('WIP explanation opens on hover, focus, and click, and dismisses on exit or Escape', async ({
  page,
}) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Universe — Work in progress' });
  const tooltip = page.getByRole('tooltip');
  await trigger.hover();
  await expect(tooltip).toHaveText('Work in progress');
  await page.mouse.move(0, 0);
  await expect(tooltip).toHaveCount(0);
  await trigger.focus();
  await expect(tooltip).toHaveText('Work in progress');
  await page.getByRole('button', { name: 'Normal', exact: true }).focus();
  await expect(tooltip).toHaveCount(0);
  await trigger.click({ force: true });
  await expect(tooltip).toHaveText('Work in progress');
  await page.keyboard.press('Escape');
  await expect(tooltip).toHaveCount(0);
});

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
    await expect(page.locator('.employer-card')).toHaveCount(4);
    await expect(page.locator('.employer-contribution')).toHaveCount(3);
    await expect(page.locator('.resume-downloads a[download]')).toHaveCount(2);
    await expect(page.getByTestId('role-text')).toHaveText('Full-Stack Developer');
    await expect(page.locator('.technology-group:not([aria-hidden]) li')).toHaveCount(26);
    await expect(page.locator('.technology-group').first()).toHaveCSS('display', 'grid');
    await page.getByRole('link', { name: 'PT', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.locator('.employer-card')).toHaveCount(4);
    await expect(page.locator('.employer-contribution')).toHaveCount(3);
    await expect(
      page.locator('.contact-card').getByRole('link', { name: /Diga olá/ }),
    ).toBeVisible();
    await expect(page.locator('a[download]')).toHaveCount(2);
  } finally {
    await context.close();
  }
});

for (const locale of ['en', 'pt-BR']) {
  test(`${locale}: journey groups contributions by employer and contact keeps direct keyboard links`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(locale === 'en' ? '/' : '/pt-BR');
    expect(
      await page
        .locator('main > section')
        .evaluateAll((sections) =>
          sections.map((section) => section.getAttribute('aria-labelledby')),
        ),
    ).toEqual([
      'hero-title',
      'technology-title',
      'engineering-title',
      'experience-title',
      'contact-title',
    ]);
    const employers = page.locator('.employer-card');
    await expect(employers.locator('h3')).toHaveText([
      'MyCareforce',
      'Plathanus',
      locale === 'en' ? 'Independent' : 'Autônomo',
      'COPPE / UFRJ',
    ]);
    await expect(employers.nth(0).locator('.employer-contribution')).toHaveCount(1);
    await expect(employers.nth(1).locator('.company-label')).toHaveText([
      'TABAS · VIA PLATHANUS',
      'BLUEGROUND · VIA PLATHANUS',
    ]);
    await expect(employers.nth(1).locator('h4')).toHaveCount(2);
    await expect(employers.nth(2).locator('.employer-contribution')).toHaveCount(0);
    await expect(employers.nth(3).locator('.employer-contribution')).toHaveCount(0);
    await expect(employers.first().locator('.timeline-meta')).toContainText('2026');
    await expect(page.locator('.contribution-grid, .current-dot')).toHaveCount(0);
    const contact = page.locator('.contact-card');
    await expect(contact.getByRole('link')).toHaveCount(3);
    const email = contact.getByRole('link', {
      name: locale === 'en' ? /Say hello/ : /Diga olá/,
    });
    await expect(email).toHaveAttribute('href', 'mailto:lfmnovaes@gmail.com');
    await email.focus();
    await expect(email).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(contact.getByRole('link', { name: 'GitHub' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(contact.getByRole('link', { name: 'LinkedIn' })).toBeFocused();
    await page.setViewportSize({ width: 320, height: 740 });
    await expect(page.locator('.experience-intro')).toHaveCSS('position', 'static');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const card of await employers.all()) {
      await card.scrollIntoViewIfNeeded();
      await expect(card).toBeVisible();
      await expect(card).toHaveCSS('opacity', '1');
    }
    await expect(email).toBeVisible();
  });
}

test('journey introduction stays in view on desktop and scroll decoration follows reading progress', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  const intro = page.locator('.experience-intro');
  const journey = page.locator('.experience-section');
  const top = await journey.evaluate((node) => node.getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top + 100);
  await expect(intro).toHaveCSS('position', isMobile ? 'static' : 'sticky');
  if (!isMobile) {
    expect((await intro.boundingBox())?.y).toBeCloseTo(140, 0);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top + 450);
    expect((await intro.boundingBox())?.y).toBeCloseTo(140, 0);
  }
  const railScale = () =>
    page.locator('.timeline').evaluate((node) => {
      const transform = getComputedStyle(node, '::after').transform;
      return transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).m22;
    });
  const scrollAnimations = await page.evaluate(() => CSS.supports('animation-timeline: view()'));
  if (scrollAnimations) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top + 100);
    await expect.poll(railScale).toBeLessThan(0.4);
    const start = await railScale();
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top + 700);
    await expect.poll(railScale).toBeGreaterThan(start + 0.15);
  } else {
    expect(await railScale()).toBe(1);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.employer-card').first()).toHaveCSS('animation-name', 'none');
  expect(await railScale()).toBe(1);
  await expect(page.locator('.employer-card').first()).toHaveCSS('opacity', '1');
});

test('unavailable decorative assets do not block profile or contact', async ({ page }) => {
  await page.route('**/mesh*.svg', (route) => route.abort());
  await page.route('**/*.woff2', (route) => route.abort());
  await page.route('**/technologies/*.svg', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Luis Fernando');
  await expect(
    page.locator('.contact-card').getByRole('link', { name: /Say hello/ }),
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
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(anchor).toHaveAttribute('data-magnetic', 'on');
  await expect
    .poll(() =>
      anchor.evaluate((node) =>
        Math.abs(Number.parseFloat(node.style.getPropertyValue('--magnet-x'))),
      ),
    )
    .toBeLessThanOrEqual(8);
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
  await expect(page.getByRole('navigation', { name: 'Language' })).toBeVisible();
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

test('the name has moving beams, hover particles and shrink/shake, with a gentler variant', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The cover reacts to mouse hover, not touch.');
  await page.goto('/');
  const cover = page.locator('.name-cover');
  const name = page.locator('.display-name');
  const beam = cover.locator('.name-beams > span').first();
  await expect(cover.locator('.name-beams > span')).toHaveCount(8);
  const idle = await cover.locator('.name-beams > span').evaluateAll((nodes) =>
    nodes.map((node) => ({
      duration: Number.parseFloat(getComputedStyle(node).animationDuration),
      delay: getComputedStyle(node).animationDelay,
      length: (node as HTMLElement).style.getPropertyValue('--length'),
    })),
  );
  expect(new Set(idle.map((item) => item.duration)).size).toBeGreaterThan(5);
  expect(new Set(idle.map((item) => item.delay)).size).toBeGreaterThan(5);
  expect(new Set(idle.map((item) => item.length)).size).toBeGreaterThan(5);
  expect(idle.every((item) => Number.parseFloat(item.length) < 10)).toBe(true);
  const position = await beam.evaluate((node) => getComputedStyle(node).translate);
  await expect
    .poll(() => beam.evaluate((node) => getComputedStyle(node).translate))
    .not.toBe(position);
  // Hold the running animations to detect a restart or phase jump on hover.
  const animations = await cover.evaluateHandle((node) =>
    Array.from(node.querySelectorAll('.name-beams > span'), (beam) => beam.getAnimations()[0]),
  );
  const heldTimes = await animations.evaluate(async (items) => {
    for (const animation of items) {
      animation.pause();
      const timing = animation.effect?.getTiming();
      animation.currentTime = Number(timing?.duration) * 5.2 + Number(timing?.delay);
    }
    await Promise.all(items.map((animation) => animation.ready));
    return items.map((animation) => animation.currentTime);
  });
  const heldPositions = await cover
    .locator('.name-beams > span')
    .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).translate));
  await cover.hover();
  await expect(name).toHaveCSS('scale', '0.8');
  await expect(name).toHaveCSS('animation-duration', '0.18s');
  await expect(name).toHaveCSS('--shake-distance', '3px');
  const tremble = await name.evaluate((node) => getComputedStyle(node).translate);
  await expect
    .poll(() => name.evaluate((node) => getComputedStyle(node).translate))
    .not.toBe(tremble);
  const hovered = await cover.locator('.name-beams > span').evaluateAll(
    (nodes, initial) =>
      nodes.map((node, index) => ({
        same: node.getAnimations()[0] === initial[index],
        time: node.getAnimations()[0].currentTime,
        translate: getComputedStyle(node).translate,
        duration: Number.parseFloat(getComputedStyle(node).animationDuration),
        length: (node as HTMLElement).style.getPropertyValue('--length'),
      })),
    animations,
  );
  expect(hovered.every((item) => item.same)).toBe(true);
  expect(hovered.map((item) => item.time)).toEqual(heldTimes);
  expect(hovered.map((item) => item.translate)).toEqual(heldPositions);
  expect(hovered.map((item) => item.duration)).toEqual(idle.map((item) => item.duration));
  expect(hovered.map((item) => item.length)).toEqual(idle.map((item) => item.length));
  await expect
    .poll(() => animations.evaluate((items) => items.map((item) => item.playbackRate)))
    .toEqual(Array(8).fill(4));
  await animations.evaluate((items) => {
    for (const animation of items) animation.play();
  });
  const shake = await name.evaluate((node) => {
    const animation = node.getAnimations().find((item) => item instanceof CSSAnimation);
    if (!(animation?.effect instanceof KeyframeEffect)) throw new Error('Missing name tremble');
    const effect = animation.effect;
    animation.pause();
    const points = effect
      .getKeyframes()
      .slice(1, -1)
      .map((frame) => {
        animation.currentTime = frame.computedOffset * Number(effect.getTiming().duration);
        return getComputedStyle(node).translate.split(' ').map(Number.parseFloat);
      });
    animation.play();
    return points;
  });
  expect(new Set(shake.map((point) => point.join(','))).size).toBeGreaterThan(5);
  expect(shake.flat().every((value) => Math.abs(value) <= 3)).toBe(true);
  expect(shake.some(([x, y]) => Math.abs(x + y) > 0.1)).toBe(true);
  await expect(cover.locator(':scope > span').nth(1)).toHaveCSS('opacity', '1');
  const stars = cover.locator('.name-stars > span');
  await expect(stars).toHaveCount(60);
  const variations = await stars.evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = (node as HTMLElement).style;
      return {
        dx: Number.parseFloat(style.getPropertyValue('--dx')),
        dy: Number.parseFloat(style.getPropertyValue('--dy')),
        timing: getComputedStyle(node).animationDuration,
      };
    }),
  );
  for (const axis of ['dx', 'dy'] as const) {
    expect(variations.some((star) => star[axis] < 0)).toBe(true);
    expect(variations.some((star) => star[axis] > 0)).toBe(true);
  }
  expect(new Set(variations.map((star) => star.timing)).size).toBeGreaterThan(40);
  const star = stars.first();
  const brightness = await star.evaluate((node) => getComputedStyle(node).opacity);
  const direction = await star.evaluate((node) => getComputedStyle(node).translate);
  await expect
    .poll(() => star.evaluate((node) => getComputedStyle(node).opacity))
    .not.toBe(brightness);
  await expect
    .poll(() => star.evaluate((node) => getComputedStyle(node).translate))
    .not.toBe(direction);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(name).toHaveCSS('scale', '0.9');
  await expect(name).toHaveCSS('animation-duration', '0.4s');
  await expect(name).toHaveCSS('--shake-distance', '1px');
  const gentleTremble = await name.evaluate((node) => getComputedStyle(node).translate);
  await expect
    .poll(() => name.evaluate((node) => getComputedStyle(node).translate))
    .not.toBe(gentleTremble);
  expect(
    Number.parseFloat(await beam.evaluate((node) => getComputedStyle(node).animationDuration)),
  ).toBeCloseTo(idle[0].duration * 3, 2);
  const beforeLeave = await animations.evaluate(async (items) => {
    for (const animation of items) animation.pause();
    await Promise.all(items.map((animation) => animation.ready));
    return items.map((animation) => animation.currentTime);
  });
  await page.mouse.move(0, 0);
  await expect
    .poll(() => animations.evaluate((items) => items.map((item) => item.playbackRate)))
    .toEqual(Array(8).fill(1));
  expect(await animations.evaluate((items) => items.map((item) => item.currentTime))).toEqual(
    beforeLeave,
  );
  expect(
    await cover
      .locator('.name-beams > span')
      .evaluateAll(
        (nodes, initial) =>
          nodes.every((node, index) => node.getAnimations()[0] === initial[index]),
        animations,
      ),
  ).toBe(true);
  await animations.evaluate((items) => {
    for (const animation of items) animation.play();
  });
  await animations.dispose();
  await expect(name).toHaveCSS('scale', 'none');
  await expect(cover.locator(':scope > span').nth(1)).toHaveCSS('opacity', '0');
  await expect(name).toHaveText('Luis Fernando');
  await expect
    .poll(() =>
      star.evaluate((node) => node.getAnimations().map((animation) => animation.playState)),
    )
    .toEqual(['paused', 'paused']);
  const gentleIdle = await cover
    .locator('.name-beams > span')
    .evaluateAll((nodes) =>
      nodes.map((node) => Number.parseFloat(getComputedStyle(node).animationDuration)),
    );
  gentleIdle.forEach((duration, index) => {
    expect(duration).toBeCloseTo(idle[index].duration * 3, 2);
  });
  // Check startup with reduced motion too: this preference used to suppress hover feedback.
  await page.reload();
  await cover.hover();
  await expect(name).toHaveCSS('scale', '0.9');
  await expect(name).toHaveCSS('animation-duration', '0.4s');
  await expect
    .poll(() =>
      cover
        .locator('.name-beams > span')
        .evaluateAll((nodes) => nodes.map((node) => node.getAnimations()[0].playbackRate)),
    )
    .toEqual(Array(8).fill(4));
});

test('the matte header and wordmark return to the top quickly without reloading either locale', async ({
  page,
}) => {
  for (const path of ['/', '/pt-BR']) {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(path);
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
    const header = page.locator('.site-header');
    await expect(page.locator('.site-shell')).toHaveAttribute('data-scrolled', 'true');
    await expect(header).toHaveCSS('backdrop-filter', 'blur(12px)');
    const alpha = await header.evaluate((node) =>
      getComputedStyle(node)
        .backgroundColor.match(/[\d.]+/g)
        ?.map(Number)
        .at(-1),
    );
    expect(alpha).toBe(0.8);
    const wordmark = header.locator('.wordmark');
    await page.clock.install();
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    await wordmark.click();
    await page.clock.runFor(80);
    const midway = await page.evaluate(() => scrollY);
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1500);
    await page.clock.runFor(350);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
    await expect(page).toHaveURL(path === '/' ? /\/$/ : /\/pt-BR$/);
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
    await expect(page.locator('.site-shell')).toHaveAttribute('data-scrolled', 'true');
    await wordmark.evaluate((node) => {
      (node as HTMLAnchorElement).click();
      // Deliver interruption before the first frame, independently of browser-driver latency.
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: 300 }));
    });
    await page.clock.runFor(400);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(1400);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
    await expect(page.locator('.site-shell')).toHaveAttribute('data-scrolled', 'true');
    await wordmark.focus();
    await page.keyboard.press('Enter');
    await page.clock.runFor(60);
    const gentleMidway = await page.evaluate(() => scrollY);
    expect(gentleMidway).toBeGreaterThan(0);
    expect(gentleMidway).toBeLessThan(1500);
    await page.clock.runFor(250);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.clock.resume();
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  }
});

test('lighting reveals the whole viewport from its button, including gentler motion and API fallback', async ({
  page,
}) => {
  await page.goto('/');
  const supported = await page.evaluate(() => typeof document.startViewTransition === 'function');
  if (supported) {
    // Hold the actual native reveal so its geometry can be inspected without a timing race.
    await page.evaluate(() => {
      const animate = document.documentElement.animate;
      document.documentElement.animate = function (keyframes, options) {
        const animation = animate.call(this, keyframes, options);
        if (
          typeof options === 'object' &&
          options.pseudoElement === '::view-transition-new(root)'
        ) {
          animation.pause();
        }
        return animation;
      };
    });
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      await page.emulateMedia({ reducedMotion });
      const button = page.getByRole('button', {
        name: reducedMotion === 'reduce' ? 'Turn the lights off' : 'Turn the lights on',
      });
      // Measure at activation so font/header layout changes cannot stale the expected origin.
      await button.evaluate((node) => {
        node.addEventListener(
          'click',
          () => {
            const rect = node.getBoundingClientRect();
            node.setAttribute(
              'data-test-origin',
              `${rect.x + rect.width / 2},${rect.y + rect.height / 2}`,
            );
          },
          { once: true, capture: true },
        );
      });
      await button.click();
      const [x, y] = await page.locator('[data-test-origin]').evaluate((node) => {
        const origin = node.getAttribute('data-test-origin')?.split(',').map(Number);
        node.removeAttribute('data-test-origin');
        if (!origin) throw new Error('Lighting control must have bounds at activation');
        return origin;
      });
      await expect
        .poll(() =>
          page.evaluate(() =>
            document.getAnimations().some((animation) => {
              const effect = animation.effect as KeyframeEffect;
              return (
                effect.pseudoElement === '::view-transition-new(root)' &&
                animation.playState === 'paused'
              );
            }),
          ),
        )
        .toBe(true);
      const reveal = await page.evaluate(() => {
        const effect = document
          .getAnimations()
          .map((animation) => animation.effect as KeyframeEffect)
          .find((effect) => effect.pseudoElement === '::view-transition-new(root)');
        if (!effect) throw new Error('Expected a real native reveal');
        return {
          duration: effect.getTiming().duration,
          frames: effect.getKeyframes(),
          width: innerWidth,
          height: innerHeight,
        };
      });
      const radius = Math.hypot(Math.max(x, reveal.width - x), Math.max(y, reveal.height - y));
      expect(reveal.duration).toBe(reducedMotion === 'reduce' ? 1000 : 700);
      for (const [index, frame] of reveal.frames.entries()) {
        const values = String(frame.clipPath)
          .match(/[\d.]+/g)
          ?.map(Number);
        if (!values) throw new Error('Expected circular clip-path keyframes');
        expect(values[0]).toBeCloseTo(
          index ? radius : reducedMotion === 'reduce' ? radius * 0.35 : 0,
          1,
        );
        expect(values[1]).toBeCloseTo(x, 1);
        expect(values[2]).toBeCloseTo(y, 1);
      }
      await expect(page.locator('.site-shell')).toHaveAttribute(
        'data-lights',
        reducedMotion === 'reduce' ? 'off' : 'on',
      );
      await page.evaluate(() => {
        document
          .getAnimations()
          .filter(
            (animation) =>
              (animation.effect as KeyframeEffect).pseudoElement === '::view-transition-new(root)',
          )
          .forEach((animation) => {
            animation.finish();
          });
      });
    }
  }
  await page.evaluate(() => {
    Object.defineProperty(document, 'startViewTransition', {
      value: undefined,
      configurable: true,
    });
  });
  await page.getByRole('button', { name: 'Turn the lights on' }).click();
  await expect(page.locator('.site-shell')).toHaveAttribute('data-lights', 'on');
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
    await expect.poll(async () => (await page.screenshot({ clip })).equals(before)).toBe(false);
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
