import { expect, test } from '@playwright/test';

import {
  DEFAULT_SIMULATION_SPEED,
  PLANETS,
  SIMULATION_SPEEDS,
} from '../src/components/universe/universe-data';
import { REALISTIC_KM_PER_UNIT } from '../src/components/universe/universe-orbits';
import en from '../src/messages/en.json';
import pt from '../src/messages/pt-BR.json';
import { readUniverseScene } from './universe-fixtures';

const copy = en.universe;
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((value, i) => value - b[i]));

test('default-speed spin and revolution freeze while paused, with animated camera travel', async ({
  page,
}) => {
  await page.goto('/universe');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-focused-planet', 'sun', { timeout: 15000 });
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  const before = await page.evaluate(readUniverseScene);
  await page.waitForTimeout(1100);
  const after = await page.evaluate(readUniverseScene);
  const earth = PLANETS.findIndex(({ id }) => id === 'earth');
  const sun = 0;
  const spin = (index: number) =>
    (after.bodies[index].spin - before.bodies[index].spin + 2 * Math.PI) % (2 * Math.PI);
  const hours = (spin(earth) * PLANETS[earth].rotationHours) / (2 * Math.PI);
  expect(hours).toBeGreaterThan(DEFAULT_SIMULATION_SPEED * 0.9);
  expect(hours).toBeLessThan(DEFAULT_SIMULATION_SPEED * 2);
  expect((spin(sun) * PLANETS[sun].rotationHours) / (2 * Math.PI)).toBeCloseTo(hours, 5);
  expect(distance(before.bodies[earth].position, after.bodies[earth].position)).toBeGreaterThan(
    0.005,
  );
  const simulatedHours = (after.bodies[sun].spin * PLANETS[sun].rotationHours) / (2 * Math.PI);
  const angle =
    PLANETS[earth].phase - (simulatedHours * 2 * Math.PI) / (PLANETS[earth].orbitalDays * 24);
  const expected = [
    Math.cos(angle) * PLANETS[earth].orbit,
    0,
    Math.sin(angle) * PLANETS[earth].orbit,
  ];
  expect(distance(after.bodies[earth].position, expected)).toBeLessThan(0.000001);
  await page.getByRole('button', { name: copy.pause, exact: true }).click();
  const paused = await page.evaluate(readUniverseScene);
  await page.waitForTimeout(2200);
  expect((await page.evaluate(readUniverseScene)).bodies).toEqual(paused.bodies);
  await page.getByRole('button', { name: copy.bodies.earth, exact: true }).click();
  await expect(canvas).not.toHaveAttribute('data-focused-planet', 'earth');
  await page.waitForTimeout(350);
  const intermediate = await page.evaluate(readUniverseScene);
  expect(distance(intermediate.camera, paused.camera)).toBeGreaterThan(0.1);
  expect(intermediate.bodies).toEqual(paused.bodies);
  await expect(canvas).toHaveAttribute('data-focused-planet', 'earth');
  const settled = await page.evaluate(readUniverseScene);
  expect(distance(intermediate.camera, settled.camera)).toBeGreaterThan(0.1);
  await page.waitForTimeout(250);
  expect((await page.evaluate(readUniverseScene)).bodies).toEqual(paused.bodies);
  await page.getByRole('button', { name: copy.scaleToggle, exact: true }).click();
  await expect(canvas).toHaveAttribute('data-focused-planet', 'earth');
  const scaled = await page.evaluate(readUniverseScene);
  await page.getByRole('button', { name: copy.bodies.pluto, exact: true }).click();
  await expect(canvas).not.toHaveAttribute('data-focused-planet', 'pluto');
  await page.waitForTimeout(350);
  const approaching = await page.evaluate(readUniverseScene);
  expect(distance(approaching.camera, scaled.camera)).toBeGreaterThan(1);
  await expect(canvas).toHaveAttribute('data-focused-planet', 'pluto');
  expect(
    distance((await page.evaluate(readUniverseScene)).camera, approaching.camera),
  ).toBeGreaterThan(0.01);
  await page.getByRole('button', { name: copy.resume, exact: true }).click();
  await expect
    .poll(async () => (await page.evaluate(readUniverseScene)).bodies[earth].spin)
    .not.toBe(paused.bodies[earth].spin);
});

test('realistic scale uses physical geometry, retains the canvas and selection, and frames every body', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/universe');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-focused-planet', 'sun');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await canvas.evaluate((element) => element.setAttribute('data-test-identity', 'retained'));
  await page.getByRole('button', { name: copy.bodies.earth, exact: true }).click();
  await expect(canvas).toHaveAttribute('data-focused-planet', 'earth');
  const artistic = await page.evaluate(readUniverseScene);
  const toggle = page.getByRole('button', { name: copy.scaleToggle, exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(canvas).toHaveAttribute('data-focused-planet', 'earth');
  const realistic = await page.evaluate(readUniverseScene);
  expect(realistic.bodies).toHaveLength(PLANETS.length);
  for (const [index, planet] of PLANETS.entries()) {
    expect(realistic.bodies[index].radius).toBe(planet.radiusKm / REALISTIC_KM_PER_UNIT);
    expect(realistic.bodies[index].spin).toBe(artistic.bodies[index].spin);
    expect(realistic.bodies[index].scale).toBe(1);
    await page.getByRole('button', { name: copy.bodies[planet.id], exact: true }).click();
    await expect(canvas).toHaveAttribute('data-focused-planet', planet.id);
    const native = await page.evaluate(readUniverseScene);
    const relative =
      distance(native.camera, native.bodies[index].position) / native.bodies[index].radius;
    expect(relative).toBeGreaterThan(4);
    expect(relative).toBeLessThan(40);
    if (index > 0) {
      const path = native.orbits[index - 1];
      expect(distance(path.origin, native.bodies[index].position)).toBeLessThan(
        native.bodies[index].radius * 0.001,
      );
      expect(Math.hypot(...path.center)).toBe(0);
    }
  }
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(canvas).toHaveAttribute('data-focused-planet', 'pluto');
  await expect(canvas).toHaveAttribute('data-test-identity', 'retained');
  expect(errors).toEqual([]);
});

for (const [path, locale] of [
  ['/universe', en],
  ['/pt-BR/universe', pt],
] as const) {
  test(`${path}: controls expose tooltips and the facts sheet animates and respects reduced motion`, async ({
    page,
  }) => {
    const text = locale.universe;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await expect(page.locator('canvas')).toHaveAttribute('data-focused-planet', 'sun');
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: text.pause, exact: true }).click();
    const control = page.getByRole('button', { name: text.scaleToggle, exact: true });
    await page.getByRole('button', { name: text.rotateDown, exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(control).toBeFocused();
    await expect(page.locator('[data-slot="tooltip-content"][data-open]')).toHaveText(
      text.realisticView,
    );
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-slot="tooltip-content"]')).toHaveCount(0);
    await page.getByRole('button', { name: text.zoomIn, exact: true }).hover();
    await expect(page.locator('[data-slot="tooltip-content"][data-open]')).toHaveText(text.zoomIn);
    const explore = page.getByRole('button', { name: text.explore, exact: true });
    const dialog = page.getByRole('dialog');
    await explore.click();
    await expect(dialog).toBeVisible();
    await expect
      .poll(() => dialog.evaluate((element) => getComputedStyle(element).translate))
      .toBe('none');
    expect(await dialog.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe(
      '0.3s',
    );
    const closing = await dialog.evaluate(
      (element) =>
        new Promise<number[]>((resolve, reject) => {
          requestAnimationFrame(() => {
            const animation = element.getAnimations()[0];
            const duration = Number(animation?.effect?.getTiming().duration);
            if (!animation || !duration) return reject(new Error('Missing closing transition'));
            // Seek the real CSS transition: software-GPU frame rate must not decide this check.
            animation.pause();
            const positions = [0, duration / 2, duration].map((time) => {
              animation.currentTime = time;
              return element.getBoundingClientRect().left;
            });
            animation.currentTime = duration / 2;
            animation.play();
            resolve(positions);
          });
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        }),
    );
    expect(closing[1]).toBeGreaterThan(closing[0]);
    expect(closing[2]).toBeGreaterThan(closing[1]);
    await expect(dialog).toHaveCount(0);
    await expect(explore).toBeFocused();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await explore.click();
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((element) => getComputedStyle(element).transitionProperty)).toBe(
      'none',
    );
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
}

for (const [path, locale] of [
  ['/universe', en],
  ['/pt-BR/universe', pt],
] as const) {
  test(`${path}: speed controls expose visible orbits in both scales and preserve pause and star positions`, async ({
    page,
  }) => {
    const text = locale.universe;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-focused-planet', 'sun');
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    const speed = page.getByRole('combobox', { name: text.timeScale });
    await expect(speed).toHaveText(text.speeds.twelveHours);
    await expect(speed).toBeEnabled();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(speed).toBeEnabled();
    await speed.click();
    await expect(page.getByRole('option')).toHaveText(
      SIMULATION_SPEEDS.map(({ label }) => text.speeds[label]),
    );
    await page.getByRole('option', { name: text.speeds.month, exact: true }).click();
    await expect(speed).toHaveText(text.speeds.month);
    await page.getByRole('button', { name: text.pause, exact: true }).click();
    for (const scale of ['artistic', 'realistic']) {
      if (scale === 'realistic') {
        await page.getByRole('button', { name: text.scaleToggle, exact: true }).click();
        await expect(canvas).toHaveAttribute('data-focused-planet', 'sun');
      }
      const before = await page.evaluate(readUniverseScene);
      expect(before.sky.count).toBe((page.viewportSize()?.width ?? 1280) < 900 ? 1200 : 3000);
      expect(new Set(before.sky.frequencies).size).toBeGreaterThan(25);
      await page.getByRole('button', { name: text.resume, exact: true }).click();
      // Fast inner planets can complete whole revolutions between two timed snapshots.
      await expect
        .poll(async () => {
          const moving = await page.evaluate(readUniverseScene);
          return [1, 3, 5, 9].every(
            (index) =>
              distance(before.bodies[index].position, moving.bodies[index].position) >
              before.bodies[index].radius * 2,
          );
        })
        .toBe(true);
      await page.getByRole('button', { name: text.pause, exact: true }).click();
      const after = await page.evaluate(readUniverseScene);
      expect(after.sky.phases).toEqual(before.sky.phases);
      expect(after.sky.positions).toEqual(before.sky.positions);
      expect(after.sky.time).toBeGreaterThan(before.sky.time);
      expect(after.sunTime).toBeGreaterThan(before.sunTime);
      await page.waitForTimeout(250);
      const paused = await page.evaluate(readUniverseScene);
      expect(paused.bodies).toEqual(after.bodies);
      expect(paused.sky).toEqual(after.sky);
      expect(paused.sunTime).toBe(after.sunTime);
    }
    await speed.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect(speed).toHaveText(text.speeds.hour);
    await expect(page.getByRole('button', { name: text.resume, exact: true })).toBeVisible();
  });
}
