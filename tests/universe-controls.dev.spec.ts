import { expect, type Page, test } from '@playwright/test';

import en from '../src/messages/en.json';
import { trackUniverseFrames } from './universe-fixtures';

const copy = en.universe;

// Demand rendering makes screenshot comparisons measure input changes, not orbital motion.
async function settle(page: Page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

test('scene wheel travel is bounded and drag capture/cancellation does not select a mesh', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/universe');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-focused-planet', 'sun');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByRole('button', { name: copy.zoomIn, exact: true })).toBeEnabled();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Missing scene');
  const point = { x: bounds.x + bounds.width * 0.5, y: bounds.y + bounds.height * 0.45 };
  await page.mouse.move(point.x, point.y);
  // Chromium scales injected wheel deltas on high-DPR mobile devices.
  await page.mouse.wheel(0, 1000);
  await expect(page.getByRole('button', { name: copy.bodies.sun, exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.mouse.wheel(0, 100_000);
  await expect(canvas).toHaveAttribute('data-focused-planet', 'pluto');
  await expect(page.getByRole('button', { name: copy.next, exact: true })).toBeDisabled();
  await page.mouse.wheel(0, -100_000);
  await expect(canvas).toHaveAttribute('data-focused-planet', 'sun');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByRole('button', { name: copy.previous, exact: true })).toBeDisabled();
  for (const modifier of ['ctrlKey', 'metaKey'] as const) {
    expect(
      await canvas.evaluate((element, key) => {
        const event = new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: 800,
          [key]: true,
        });
        element.dispatchEvent(event);
        return event.defaultPrevented;
      }, modifier),
    ).toBe(modifier === 'ctrlKey');
  }
  await page.getByRole('link', { name: 'GitHub', exact: true }).hover();
  await page.mouse.wheel(0, 260);
  await expect(canvas).toHaveAttribute('data-focused-planet', 'sun');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page.getByRole('button', { name: copy.bodies.mercury, exact: true }).click();
  await expect(canvas).toHaveAttribute('data-focused-planet', 'mercury');
  const dragBounds = await canvas.boundingBox();
  if (!dragBounds) throw new Error('Missing scene');
  point.y = dragBounds.y + dragBounds.height * 0.45;
  await settle(page);
  const before = await canvas.screenshot();
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 100, point.y + 35, { steps: 10 });
  // Leave the canvas while captured, then release: no stuck drag or accidental selection.
  const header = await page.getByRole('link', { name: 'GitHub', exact: true }).boundingBox();
  if (!header) throw new Error('Missing header control');
  await page.mouse.move(header.x + header.width / 2, header.y + header.height / 2);
  await page.mouse.up();
  await settle(page);
  expect(await canvas.screenshot()).not.toEqual(before);
  await expect(
    page.getByRole('button', { name: copy.bodies.mercury, exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: copy.scene })).not.toHaveAttribute(
    'data-dragging',
    'true',
  );

  await page.evaluate(() =>
    document.addEventListener(
      'pointerdown',
      (event) => {
        Reflect.set(window, 'activeUniversePointer', event.pointerId);
      },
      { once: true },
    ),
  );
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 30, point.y + 10);
  await canvas.evaluate((element) =>
    element.dispatchEvent(
      new PointerEvent('pointercancel', {
        pointerId: Reflect.get(window, 'activeUniversePointer') as number,
        bubbles: true,
      }),
    ),
  );
  await settle(page);
  const cancelled = await canvas.screenshot();
  await page.mouse.move(point.x + 80, point.y + 10);
  await settle(page);
  expect(await canvas.screenshot()).toEqual(cancelled);
  await page.mouse.up();
  await page.getByRole('button', { name: copy.zoomIn, exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await settle(page);
  expect(await canvas.screenshot()).not.toEqual(cancelled);
  expect(errors).toEqual([]);
});

test('real two-finger pinch and one-finger touch drag update the scene', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Native multi-touch injection uses the Chromium CDP input API.',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/universe');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-focused-planet', 'sun');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page.getByRole('button', { name: copy.bodies.earth, exact: true }).click();
  await expect(canvas).toHaveAttribute('data-focused-planet', 'earth');
  await settle(page);
  const before = await canvas.screenshot();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Missing scene');
  const y = bounds.y + bounds.height * 0.55;
  const x = bounds.x + bounds.width / 2;
  const spread = Math.min(50, bounds.width / 8);
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: x - spread, y, id: 1 },
      { x: x + spread, y, id: 2 },
    ],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: x - spread * 1.5, y, id: 1 },
      { x: x + spread * 1.5, y, id: 2 },
    ],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await settle(page);
  const pinched = await canvas.screenshot();
  expect(pinched).not.toEqual(before);
  await expect(page.getByRole('button', { name: copy.bodies.earth, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1 }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x + 45, y: y + 20, id: 1 }],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await settle(page);
  expect(await canvas.screenshot()).not.toEqual(pinched);
  await expect(page.getByRole('region', { name: copy.scene })).not.toHaveAttribute(
    'data-dragging',
    'true',
  );
  await client.detach();
});

test('reading facts freezes the renderer, traps focus, and allows native panel scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 420 });
  await page.addInitScript(trackUniverseFrames);
  await page.goto('/universe');
  await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'sun');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page.getByRole('button', { name: copy.explore, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: copy.bodies.sun, exact: true });
  await expect(dialog).toBeVisible();
  await settle(page);
  const frames = () => page.evaluate(() => Reflect.get(window, 'universeFrames') as number);
  const stopped = await frames();
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(200);
  expect(await frames()).toBe(stopped);
  await dialog.hover();
  await page.mouse.wheel(0, 300);
  await expect.poll(() => dialog.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  await expect(
    page.getByRole('meter', { name: copy.position, includeHidden: true }),
  ).toHaveAttribute('aria-valuetext', copy.bodies.sun);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: copy.explore, exact: true })).toBeFocused();
  await expect.poll(frames).toBeGreaterThan(stopped);
});
