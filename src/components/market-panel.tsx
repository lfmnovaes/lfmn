'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  type Candle,
  MARKET_INTERVALS,
  MARKET_REST,
  MARKET_SOCKET,
  MARKET_SYMBOLS,
  type MarketInterval,
  type MarketSymbol,
  parseHistory,
  parseMarketEvent,
} from '@/lib/market-data';
import type messages from '@/messages/en.json';
import type { mountMarketChart } from './market-chart';
import { useLighting } from './site-shell';
import { Button } from './ui/button';

type Status = 'idle' | 'loading' | 'connecting' | 'live' | 'stale' | 'offline' | 'paused' | 'error';
type Snapshot = { key: string; candle: Candle; eventTime: number; receivedAt: number };

export function MarketPanel({ copy, locale }: { copy: typeof messages.market; locale: string }) {
  const panel = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const chart = useRef<ReturnType<typeof mountMarketChart> | null>(null);
  const last = useRef<Snapshot | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [symbol, setSymbol] = useState<MarketSymbol>('PAXGUSDT');
  const [interval, setCandleInterval] = useState<MarketInterval>('1m');
  const [near, setNear] = useState(false);
  const [environment, setEnvironment] = useState({ visible: true, online: true });
  const [status, setStatus] = useState<Status>('idle');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const { lights } = useLighting();
  const key = `${symbol}:${interval}`;
  const current = snapshot?.key === key ? snapshot : null;

  useEffect(() => {
    if (!panel.current) return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      rootMargin: '200px',
    });
    observer.observe(panel.current);
    const activity = () => setEnvironment({ visible: !document.hidden, online: navigator.onLine });
    activity();
    document.addEventListener('visibilitychange', activity);
    window.addEventListener('online', activity);
    window.addEventListener('offline', activity);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', activity);
      window.removeEventListener('online', activity);
      window.removeEventListener('offline', activity);
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: The canvas must repaint when inherited CSS theme colors change.
  useEffect(() => chart.current?.palette(), [lights]);
  useEffect(
    () => () => {
      chart.current?.remove();
      chart.current = null;
    },
    [],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: Explicit retry restarts the entire network cycle and cancels previous work.
  useEffect(() => {
    if (last.current?.key !== key) chart.current?.setData([]);
    if (!environment.online || !near || !environment.visible) {
      setLoading(false);
      setStatus(!environment.online ? 'offline' : last.current?.key === key ? 'paused' : 'idle');
      return;
    }
    let cancelled = false;
    let socket: WebSocket | null = null;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setInterval> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const controller = new AbortController();
    const active = () => !cancelled && !controller.signal.aborted;

    function closeSocket() {
      clearInterval(watchdog);
      if (socket) {
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
        socket = null;
      }
    }
    function reconnectLater() {
      if (!active()) return;
      closeSocket();
      setStatus(last.current?.key === key ? 'stale' : 'error');
      if (attempts >= 5 || reconnect !== undefined) return;
      reconnect = setTimeout(
        () => {
          reconnect = undefined;
          void start();
        },
        Math.min(30_000, 1000 * 2 ** attempts++),
      );
    }
    function publish(item: Candle, eventTime: number) {
      const next = { key, candle: item, eventTime, receivedAt: Date.now() };
      last.current = next;
      setSnapshot(next);
    }
    function connect() {
      socket = new WebSocket(`${MARKET_SOCKET}${symbol.toLowerCase()}@kline_${interval}`);
      let received = Date.now();
      setStatus('connecting');
      socket.onclose = reconnectLater;
      socket.onerror = reconnectLater;
      socket.onmessage = (event) => {
        if (!active()) return;
        try {
          if (typeof event.data !== 'string') throw new Error('Unexpected market payload');
          const update = parseMarketEvent(event.data, symbol, interval);
          const previous = last.current;
          if (
            previous?.key === key &&
            (update.eventTime < previous.eventTime || update.candle.time < previous.candle.time)
          )
            return;
          if (
            Date.now() - update.eventTime > 20_000 ||
            (previous?.key === key &&
              update.candle.time > previous.candle.time + MARKET_INTERVALS[interval])
          ) {
            reconnectLater();
            return;
          }
          chart.current?.update(update.candle);
          publish(update.candle, update.eventTime);
          received = Date.now();
          attempts = 0;
          setStatus('live');
        } catch {
          reconnectLater();
        }
      };
      watchdog = setInterval(() => {
        if (Date.now() - received > 15_000) reconnectLater();
      }, 5000);
    }
    async function history() {
      const query = new URLSearchParams({ symbol, interval, limit: '120' });
      const response = await fetch(`${MARKET_REST}?${query}`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
        cache: 'no-store',
        credentials: 'omit',
      });
      if (!response.ok) throw new Error('Market data unavailable');
      const body = await response.text();
      if (body.length > 256_000) throw new Error('Oversized market history');
      return parseHistory(JSON.parse(body), interval);
    }
    async function start() {
      if (!active()) return;
      closeSocket();
      setLoading(true);
      setStatus(last.current?.key === key ? 'stale' : 'loading');
      try {
        const timeout = new Promise<never>((_, reject) => {
          deadline = setTimeout(() => reject(new Error('Market load timed out')), 15_000);
        });
        const [module, data] = await Promise.race([
          Promise.all([import('./market-chart'), history()]),
          timeout,
        ]);
        if (!active() || !canvas.current) return;
        chart.current ??= module.mountMarketChart(canvas.current);
        const latest = data[data.length - 1];
        if (last.current?.key === key && latest.time < last.current.candle.time)
          throw new Error('Outdated market history');
        chart.current.setData(data);
        publish(latest, last.current?.key === key ? last.current.eventTime : 0);
        connect();
      } catch {
        if (active()) {
          setStatus(last.current?.key === key ? 'stale' : 'error');
          if (last.current?.key === key) reconnectLater();
        }
      } finally {
        clearTimeout(deadline);
        if (active()) setLoading(false);
      }
    }
    void start();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(reconnect);
      clearTimeout(deadline);
      closeSocket();
    };
  }, [key, symbol, interval, near, environment.online, environment.visible, retry]);

  const format = (value: number, decimals = 2) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals === 2 ? 2 : 0,
      maximumFractionDigits: decimals,
    }).format(value);
  return (
    <>
      {loading && (
        <div className="market-loading-bar" role="progressbar" aria-label={copy.loading} />
      )}
      <article className="bento-card market-card" ref={panel} aria-labelledby="market-title">
        <div className="market-heading">
          <p className="eyebrow">{copy.eyebrow}</p>
          <span className={`market-status status-${status}`} role="status">
            {copy.states[status]}
          </span>
        </div>
        <h3 id="market-title">{copy.title}</h3>
        <p className="bento-description">{copy.intro}</p>
        <div className="market-controls">
          <label htmlFor="market-symbol" className="sr-only">
            {copy.instrument}
          </label>
          <select
            id="market-symbol"
            value={symbol}
            onChange={(event) => {
              if (Object.hasOwn(MARKET_SYMBOLS, event.target.value))
                setSymbol(event.target.value as MarketSymbol);
            }}
          >
            {Object.entries(MARKET_SYMBOLS).map(([value, name]) => (
              <option value={value} key={value}>
                {name} / USDT
              </option>
            ))}
          </select>
          <fieldset aria-label={copy.interval}>
            {Object.keys(MARKET_INTERVALS).map((value) => (
              <Button
                key={value}
                variant="ghost"
                aria-pressed={interval === value}
                onClick={() => setCandleInterval(value as MarketInterval)}
              >
                {value}
              </Button>
            ))}
          </fieldset>
        </div>
        <div className="market-price">
          <strong data-testid="market-price">{current ? format(current.candle.close) : '—'}</strong>
          <span>USDT</span>
        </div>
        <div className="market-canvas" ref={canvas} aria-hidden="true" />
        {!current && (
          <p className="market-fallback">{status === 'error' ? copy.unavailable : copy.fallback}</p>
        )}
        {current && (
          <dl className="market-summary">
            <div>
              <dt>{copy.high}</dt>
              <dd>{format(current.candle.high)}</dd>
            </div>
            <div>
              <dt>{copy.low}</dt>
              <dd>{format(current.candle.low)}</dd>
            </div>
            <div>
              <dt>{copy.volume}</dt>
              <dd>
                {format(current.candle.volume, 4)} {symbol.replace('USDT', '')}
              </dd>
            </div>
          </dl>
        )}
        <div className="market-update">
          <p>
            {copy.received}:{' '}
            {current ? (
              <time dateTime={new Date(current.receivedAt).toISOString()}>
                {new Intl.DateTimeFormat(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }).format(current.receivedAt)}
              </time>
            ) : (
              '—'
            )}
          </p>
          {(status === 'error' || status === 'stale' || status === 'offline') && (
            <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
              <RefreshCw size={14} aria-hidden="true" />
              {copy.retry}
            </Button>
          )}
        </div>
        <p className="market-note">{copy.note}</p>
        <p className="market-attribution">
          {copy.source}:{' '}
          <a
            href={`https://www.binance.com/en/trade/${symbol.replace('USDT', '_USDT')}`}
            target="_blank"
            rel="noreferrer"
          >
            Binance
          </a>
          <span> · </span>
          <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">
            TradingView Lightweight Charts™
          </a>
          <br />
          Copyright © 2025 TradingView, Inc.
        </p>
      </article>
    </>
  );
}
