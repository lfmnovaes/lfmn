export const MARKET_SYMBOLS = {
  PAXGUSDT: 'PAX Gold',
  BTCUSDT: 'Bitcoin',
  ETHUSDT: 'Ethereum',
} as const;
export const MARKET_INTERVALS = { '1m': 60, '5m': 300, '1h': 3600 } as const;
export type MarketSymbol = keyof typeof MARKET_SYMBOLS;
export type MarketInterval = keyof typeof MARKET_INTERVALS;
export type MarketRequest = { symbol: MarketSymbol; interval: MarketInterval };
export const MARKET_OPTIONS = Object.entries(MARKET_SYMBOLS).map(([value, label]) => ({
  value: value as MarketSymbol,
  label: `${label} / USDT`,
}));
export const MARKET_INTERVAL_OPTIONS = Object.keys(MARKET_INTERVALS) as MarketInterval[];

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
export const MARKET_REST = 'https://data-api.binance.vision/api/v3/klines';
export const MARKET_SOCKET = 'wss://data-stream.binance.vision/ws/';

function numeric(value: unknown): number {
  if (
    typeof value !== 'number' &&
    (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value))
  ) {
    throw new Error('Invalid market number');
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error('Invalid market number');
  return number;
}

function candle(values: unknown[], interval: MarketInterval): Candle {
  const [milliseconds, open, high, low, close, volume] = values.map(numeric);
  if (
    !Number.isSafeInteger(milliseconds) ||
    milliseconds <= 0 ||
    milliseconds > Date.now() + MARKET_INTERVALS[interval] * 1000 ||
    milliseconds % (MARKET_INTERVALS[interval] * 1000) !== 0 ||
    Math.min(open, high, low, close) <= 0 ||
    high < Math.max(open, low, close) ||
    low > Math.min(open, high, close) ||
    volume < 0
  ) {
    throw new Error('Invalid market candle');
  }
  return { time: milliseconds / 1000, open, high, low, close, volume };
}

export function parseHistory(value: unknown, interval: MarketInterval): Candle[] {
  if (!Array.isArray(value) || !value.length || value.length > 500) {
    throw new Error('Invalid market history');
  }
  const candles = value.map((row: unknown) => {
    if (!Array.isArray(row) || row.length < 6) throw new Error('Invalid market history');
    return candle(row.slice(0, 6), interval);
  });
  if (candles.some((item, i) => i > 0 && item.time <= candles[i - 1].time)) {
    throw new Error('Unordered market history');
  }
  return candles;
}

export function parseMarketEvent(
  raw: string,
  symbol: MarketSymbol,
  interval: MarketInterval,
): { candle: Candle; eventTime: number } {
  if (raw.length > 64_000) throw new Error('Oversized market event');
  const message = JSON.parse(raw);
  if (
    message?.e !== 'kline' ||
    message.s !== symbol ||
    message.k?.s !== symbol ||
    message.k?.i !== interval
  ) {
    throw new Error('Unexpected market event');
  }
  const eventTime = numeric(message.E);
  if (!Number.isSafeInteger(eventTime) || eventTime <= 0 || eventTime > Date.now() + 60_000) {
    throw new Error('Invalid market event time');
  }
  const k = message.k;
  return { candle: candle([k.t, k.o, k.h, k.l, k.c, k.v], interval), eventTime };
}
