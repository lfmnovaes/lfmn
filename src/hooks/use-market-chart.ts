'use client';

import { useEffect, useRef, useState } from 'react';

import type { mountMarketChart } from '@/lib/market-chart';
import {
  type Candle,
  MARKET_INTERVALS,
  MARKET_REST,
  MARKET_SOCKET,
  type MarketRequest,
  parseHistory,
  parseMarketEvent,
} from '@/lib/market-data';

type Status = 'idle' | 'loading' | 'connecting' | 'live' | 'stale' | 'offline' | 'paused' | 'error';
type Snapshot = { key: string; candle: Candle; eventTime: number; receivedAt: number };

export function useMarketChart(request: MarketRequest) {
  const { symbol, interval } = request;
  const panel = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const chart = useRef<ReturnType<typeof mountMarketChart> | null>(null);
  const last = useRef<Snapshot | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [near, setNear] = useState(false);
  const [environment, setEnvironment] = useState({ visible: true, online: true });
  const [status, setStatus] = useState<Status>('idle');
  const [loading, setLoading] = useState(false);
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

  useEffect(
    () => () => {
      chart.current?.remove();
      chart.current = null;
    },
    [],
  );

  useEffect(() => {
    const { symbol, interval } = request;
    const key = `${symbol}:${interval}`;
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
          Promise.all([import('@/lib/market-chart'), history()]),
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
  }, [request, near, environment.online, environment.visible]);

  return { panel, canvas, current, status, loading };
}
