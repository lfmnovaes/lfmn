import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test, type WebSocketRoute } from '@playwright/test';
import type { MarketInterval, MarketSymbol } from '../src/lib/market-data';
import { MARKET_INTERVALS, parseHistory, parseMarketEvent } from '../src/lib/market-data';

const prices = { PAXGUSDT: 4000, BTCUSDT: 65000, ETHUSDT: 2500 };
function history(
  symbol: MarketSymbol = 'PAXGUSDT',
  interval: MarketInterval = '1m',
  now = Date.now(),
) {
  const span = MARKET_INTERVALS[interval] * 1000;
  const end = Math.floor(now / span) * span;
  return Array.from({ length: 80 }, (_, index) => [
    end - (79 - index) * span,
    String(prices[symbol]),
    String(prices[symbol] + 3),
    String(prices[symbol] - 3),
    String(prices[symbol] + 1),
    '5.25',
  ]);
}
function tick(
  symbol: MarketSymbol = 'PAXGUSDT',
  interval: MarketInterval = '1m',
  eventTime = Date.now(),
) {
  const span = MARKET_INTERVALS[interval] * 1000;
  return JSON.stringify({
    e: 'kline',
    E: eventTime,
    s: symbol,
    k: {
      s: symbol,
      i: interval,
      t: Math.floor(eventTime / span) * span,
      o: String(prices[symbol]),
      h: String(prices[symbol] + 9),
      l: String(prices[symbol] - 3),
      c: String(prices[symbol] + 7.5),
      v: '12.25',
    },
  });
}
async function fixture(
  page: Page,
  resolve: (symbol: MarketSymbol, interval: MarketInterval) => unknown | Promise<unknown> = history,
) {
  const requests: string[] = [];
  const sockets: { route: WebSocketRoute; closed: boolean }[] = [];
  await page.route('https://data-api.binance.vision/api/v3/klines?**', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.search);
    const body = await resolve(
      url.searchParams.get('symbol') as MarketSymbol,
      url.searchParams.get('interval') as MarketInterval,
    );
    if (body === null) await route.abort();
    else await route.fulfill({ json: body, headers: { 'access-control-allow-origin': '*' } });
  });
  await page.routeWebSocket('wss://data-stream.binance.vision/**', (route) => {
    const connection = { route, closed: false };
    route.onClose(() => {
      connection.closed = true;
    });
    sockets.push(connection);
  });
  return { requests, sockets };
}
async function show(page: Page, path = '/') {
  await page.goto(path);
  await page.locator('.market-card').scrollIntoViewIfNeeded();
}

test('chart loads on demand, reports real pending work, and only calls fresh stream data Live', async ({
  page,
}) => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const { requests, sockets } = await fixture(page, async (symbol, interval) => {
    await pending;
    return history(symbol, interval);
  });
  await page.goto('/');
  expect(requests).toHaveLength(0);
  await expect(page.locator('.market-canvas canvas')).toHaveCount(0);
  await page.locator('.market-card').scrollIntoViewIfNeeded();
  const bar = page.getByRole('progressbar', { name: 'Loading market chart and data' });
  await expect(bar).toBeVisible();
  expect(await bar.boundingBox()).toMatchObject({
    x: 0,
    y: 0,
    height: 1,
    width: page.viewportSize()?.width,
  });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Luis Fernando');
  release();
  await expect(bar).toHaveCount(0);
  await expect(page.locator('.market-status')).toHaveText('Connecting');
  await expect(page.getByTestId('market-price')).toHaveText('4,001.00');
  await expect.poll(() => sockets.length).toBe(1);
  sockets[0].route.send(tick());
  await expect(page.locator('.market-status')).toHaveText('Live');
  await expect(page.getByTestId('market-price')).toHaveText('4,007.50');
  expect(await page.locator('.market-canvas canvas').count()).toBeGreaterThan(0);
  await expect(page.locator('.market-summary')).toContainText('12.25 PAXG');
  await expect(page.locator('.market-update time')).toHaveAttribute('datetime', /T/);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('switches instruments and intervals without letting an obsolete response overwrite the new selection', async ({
  page,
}) => {
  let release = () => {};
  const old = new Promise<void>((resolve) => {
    release = resolve;
  });
  const { requests, sockets } = await fixture(page, async (symbol, interval) => {
    if (symbol === 'BTCUSDT') await old;
    return history(symbol, interval);
  });
  await show(page);
  await expect.poll(() => sockets.length).toBe(1);
  sockets[0].route.send(tick());
  await expect(page.locator('.market-status')).toHaveText('Live');
  await page.getByLabel('Market instrument', { exact: true }).selectOption('BTCUSDT');
  await expect.poll(() => requests.some((query) => query.includes('BTCUSDT'))).toBe(true);
  await page.getByLabel('Market instrument', { exact: true }).selectOption('ETHUSDT');
  await expect(page.getByTestId('market-price')).toHaveText('2,501.00');
  release();
  await expect.poll(() => sockets[0].closed).toBe(true);
  await expect(page.getByTestId('market-price')).toHaveText('2,501.00');
  await page.getByRole('button', { name: '5m', exact: true }).click();
  await expect
    .poll(() =>
      requests.some((query) => query.includes('ETHUSDT') && query.includes('interval=5m')),
    )
    .toBe(true);
  await expect(page.getByRole('button', { name: '5m', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect.poll(() => sockets.length).toBe(3);
  sockets[2].route.send(tick('ETHUSDT', '5m'));
  await expect(page.getByTestId('market-price')).toHaveText('2,507.50');
  await expect(page.locator('.market-attribution a').first()).toHaveAttribute('href', /ETH_USDT$/);
});

test('blocked and malformed history clears loading and can recover with Retry', async ({
  page,
}) => {
  let mode = 'blocked';
  const { sockets } = await fixture(page, () =>
    mode === 'blocked'
      ? null
      : mode === 'invalid'
        ? [[Date.now(), 'Infinity', 1, 1, 1, 1]]
        : history(),
  );
  await show(page);
  await expect(page.locator('.market-status')).toHaveText('Unavailable');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByTestId('market-price')).toHaveText('—');
  mode = 'invalid';
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.market-status')).toHaveText('Unavailable');
  expect(sockets).toHaveLength(0);
  mode = 'ready';
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect.poll(() => sockets.length).toBe(1);
  sockets[0].route.send(tick());
  await expect(page.locator('.market-status')).toHaveText('Live');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
});

test('silent or invalid streams retain the last price and reconnect with a bounded retry count', async ({
  page,
}) => {
  const start = new Date();
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
  const { sockets } = await fixture(page, (symbol, interval) =>
    history(symbol, interval, start.getTime()),
  );
  await show(page);
  await expect.poll(() => sockets.length).toBe(1);
  sockets[0].route.send(tick('PAXGUSDT', '1m', await page.evaluate(() => Date.now())));
  await expect(page.locator('.market-status')).toHaveText('Live');
  await page.clock.runFor(20_100);
  await expect(page.locator('.market-status')).toHaveText('Data stale');
  await expect(page.getByTestId('market-price')).toHaveText('4,007.50');
  await page.clock.runFor(1000);
  await expect.poll(() => sockets.length).toBe(2);
  sockets[1].route.send('{malformed');
  await expect(page.locator('.market-status')).toHaveText('Data stale');
  for (let attempt = 1; attempt <= 4; attempt++) {
    await page.clock.runFor(1000 * 2 ** attempt + 100);
    await expect.poll(() => sockets.length).toBe(attempt + 2);
    sockets[attempt + 1].route.send(tick('BTCUSDT', '1m', await page.evaluate(() => Date.now())));
    await expect(page.locator('.market-status')).toHaveText('Data stale');
  }
  const count = sockets.length;
  await page.clock.runFor(60_000);
  expect(sockets).toHaveLength(count);
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
});

test('offline, hidden, and offscreen states close the stream and keep the last valid summary', async ({
  page,
  context,
}) => {
  const { sockets } = await fixture(page);
  await show(page);
  await expect.poll(() => sockets.length).toBe(1);
  sockets[0].route.send(tick());
  await expect(page.locator('.market-status')).toHaveText('Live');
  await context.setOffline(true);
  await expect(page.locator('.market-status')).toHaveText('Offline');
  await expect.poll(() => sockets[0].closed).toBe(true);
  await expect(page.getByTestId('market-price')).toHaveText('4,007.50');
  await context.setOffline(false);
  await expect.poll(() => sockets.length).toBe(2);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.market-status')).toHaveText('Updates paused');
  await expect.poll(() => sockets[1].closed).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => sockets.length).toBe(3);
  await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded();
  await expect(page.locator('.market-status')).toHaveText('Updates paused');
  await expect.poll(() => sockets[2].closed).toBe(true);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
});

test('Portuguese, lighting, gentle effects, and phone controls remain accessible', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sockets } = await fixture(page);
  await show(page, '/pt-BR');
  await expect.poll(() => sockets.length).toBe(1);
  sockets[0].route.send(tick());
  await expect(page.locator('.market-status')).toHaveText('Ao vivo');
  await expect(page.getByTestId('market-price')).toHaveText('4.007,50');
  await expect(page.locator('.badge-face').first()).toHaveCSS(
    'animation-name',
    'badge-float-reduced',
  );
  await expect(page.locator('.service-track')).toHaveCSS('animation-duration', '70s');
  await expect(page.locator('.service-list:not([aria-hidden]) li')).toHaveCount(6);
  await expect(page.locator('.motion-button')).toHaveCount(0);
  await page.getByRole('button', { name: 'Acender as luzes', exact: true }).click();
  await expect(page.locator('.site-shell')).toHaveAttribute('data-lights', 'on');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.locator('.market-card').scrollIntoViewIfNeeded();
  await page.getByLabel('Ativo de mercado', { exact: true }).selectOption('ETHUSDT');
  await expect(page.getByTestId('market-price')).toHaveText('2.501,00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('market boundaries reject nonfinite values, invalid ranges, ordering, and mismatched streams', () => {
  const rows = history();
  expect(parseHistory(rows, '1m')).toHaveLength(80);
  for (const input of [
    null,
    [],
    [...rows].reverse(),
    [rows[0], rows[0]],
    [[...rows[0].slice(0, 1), 'Infinity', 1, 1, 1, 1]],
    [[rows[0][0], 5, 4, 2, 3, 1]],
    [[rows[0][0], 3, 4, 2, 3, -1]],
    [[rows[0][0], true, 4, 2, 3, 1]],
  ]) {
    expect(() => parseHistory(input, '1m')).toThrow();
  }
  expect(parseMarketEvent(tick(), 'PAXGUSDT', '1m').candle.close).toBe(4007.5);
  expect(() => parseMarketEvent(tick('BTCUSDT'), 'PAXGUSDT', '1m')).toThrow();
  expect(() => parseMarketEvent(tick('PAXGUSDT', '5m'), 'PAXGUSDT', '1m')).toThrow();
  expect(() => parseMarketEvent('{broken', 'PAXGUSDT', '1m')).toThrow();
});

test('bento animations move by default and both profile and market sources work without JavaScript', async ({
  page,
  browser,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await fixture(page);
  await page.goto('/');
  await page.locator('.service-feed').scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const track = page.locator('.service-track');
  const first = await track.evaluate((node) => getComputedStyle(node).transform);
  await expect
    .poll(() => track.evaluate((node) => getComputedStyle(node).transform))
    .not.toBe(first);
  const packet = page.locator('.flow-packet').first();
  const offset = await packet.evaluate((node) => getComputedStyle(node).strokeDashoffset);
  await expect
    .poll(() => packet.evaluate((node) => getComputedStyle(node).strokeDashoffset))
    .not.toBe(offset);
  await page.locator('.service-feed').focus();
  await expect(track).toHaveCSS('animation-play-state', 'paused');
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
  try {
    const noScript = await context.newPage();
    await noScript.goto('http://127.0.0.1:3100/');
    await expect(noScript.locator('.service-list:not([aria-hidden]) li')).toHaveCount(6);
    await expect(noScript.locator('.service-duplicate')).toBeHidden();
    await expect(noScript.getByRole('heading', { name: 'Connected by design' })).toBeVisible();
    await expect(noScript.locator('a[download]')).toHaveCount(2);
    await expect(noScript.locator('.market-attribution a').last()).toHaveAttribute(
      'href',
      'https://www.tradingview.com/',
    );
    await expect(noScript.getByTestId('market-price')).toHaveText('—');
    await expect(noScript.locator('.market-controls')).toBeHidden();
  } finally {
    await context.close();
  }
});
