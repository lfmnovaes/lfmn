import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { SIMULATION_SPEEDS } from '../src/components/universe/universe-data';
import en from '../src/messages/en.json';
import pt from '../src/messages/pt-BR.json';
import { readUniverseScene } from './universe-fixtures';

for (const [path, locale] of [
  ['/universe', en],
  ['/pt-BR/universe', pt],
] as const) {
  const copy = locale.universe;
  test(`${path}: reduced-motion defaults can be enabled and remain enabled across reloads`, async ({
    page,
  }) => {
    const clockWarnings: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('THREE.Clock')) clockWarnings.push(message.text());
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-focused-planet', 'sun');
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect(page.getByText(copy.reducedMotion, { exact: true })).toBeVisible();
    const speed = page.getByRole('combobox', { name: copy.timeScale });
    await expect(speed).toBeEnabled();
    await expect(speed).toHaveText(copy.speeds.twelveHours);
    const stopped = await page.evaluate(readUniverseScene);
    await page.waitForTimeout(200);
    expect((await page.evaluate(readUniverseScene)).bodies).toEqual(stopped.bodies);
    await speed.click();
    await expect(page.getByRole('option')).toHaveText(
      SIMULATION_SPEEDS.map(({ label }) => copy.speeds[label]),
    );
    await page.getByRole('option', { name: copy.speeds.month, exact: true }).click();
    await expect(speed).toHaveText(copy.speeds.month);
    await expect(page.getByText(copy.reducedMotion, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: copy.pause, exact: true })).toBeVisible();
    await expect
      .poll(async () => (await page.evaluate(readUniverseScene)).bodies[3].spin)
      .not.toBe(stopped.bodies[3].spin);
    await page.getByRole('button', { name: copy.pause, exact: true }).click();
    await page.getByRole('button', { name: copy.bodies.earth, exact: true }).click();
    await expect(canvas).not.toHaveAttribute('data-focused-planet', 'earth');
    await page.waitForTimeout(250);
    const travelling = await page.evaluate(readUniverseScene);
    expect(travelling.camera).not.toEqual(stopped.camera);
    await expect(canvas).toHaveAttribute('data-focused-planet', 'earth', { timeout: 15000 });
    expect((await page.evaluate(readUniverseScene)).camera).not.toEqual(travelling.camera);
    await page.reload();
    await expect(page.getByRole('button', { name: copy.pause, exact: true })).toBeEnabled();
    await expect(canvas).toHaveAttribute('data-focused-planet', 'sun', { timeout: 15000 });
    await expect(speed).toHaveText(copy.speeds.twelveHours);
    await expect(page.getByText(copy.reducedMotion, { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Use system motion preference|Usar preferência/ }),
    ).toHaveCount(0);
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(audit.violations).toEqual([]);
    await page.setViewportSize({ width: 320, height: 740 });
    const overflows = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    await expect.poll(overflows).toBe(false);
    expect(clockWarnings).toEqual([]);
  });

  test(`${path}: enabling animation works when preference storage is unavailable`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      for (const method of ['getItem', 'setItem', 'removeItem'])
        Object.defineProperty(Storage.prototype, method, {
          value() {
            throw new DOMException('Storage unavailable', 'SecurityError');
          },
        });
    });
    await page.goto(path);
    await expect(page.getByRole('button', { name: copy.zoomIn, exact: true })).toBeEnabled();
    await page.getByRole('button', { name: copy.enableMotion, exact: true }).first().click();
    await expect(page.getByRole('button', { name: copy.pause, exact: true })).toBeVisible();
    const before = await page.evaluate(readUniverseScene);
    await expect
      .poll(async () => (await page.evaluate(readUniverseScene)).bodies[3].spin)
      .not.toBe(before.bodies[3].spin);
  });
}
