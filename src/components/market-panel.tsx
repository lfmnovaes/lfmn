'use client';

import { RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMarketChart } from '@/hooks/use-market-chart';
import {
  MARKET_INTERVALS,
  MARKET_SYMBOLS,
  type MarketInterval,
  type MarketSymbol,
} from '@/lib/market-data';
import type messages from '@/messages/en.json';
import { useLighting } from './site-shell';
import { Button } from './ui/button';

export function MarketPanel({ copy, locale }: { copy: typeof messages.market; locale: string }) {
  const [symbol, setSymbol] = useState<MarketSymbol>('PAXGUSDT');
  const [interval, setCandleInterval] = useState<MarketInterval>('1m');
  const { lights } = useLighting();
  const { panel, canvas, current, status, loading, retry } = useMarketChart({
    symbol,
    interval,
    lights,
  });
  const formatters = useMemo(
    () => ({
      price: new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      volume: new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }),
      time: new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    }),
    [locale],
  );
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
          <strong data-testid="market-price">
            {current ? formatters.price.format(current.candle.close) : '—'}
          </strong>
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
              <dd>{formatters.price.format(current.candle.high)}</dd>
            </div>
            <div>
              <dt>{copy.low}</dt>
              <dd>{formatters.price.format(current.candle.low)}</dd>
            </div>
            <div>
              <dt>{copy.volume}</dt>
              <dd>
                {formatters.volume.format(current.candle.volume)} {symbol.replace('USDT', '')}
              </dd>
            </div>
          </dl>
        )}
        <div className="market-update">
          <p>
            {copy.received}:{' '}
            {current ? (
              <time dateTime={new Date(current.receivedAt).toISOString()}>
                {formatters.time.format(current.receivedAt)}
              </time>
            ) : (
              '—'
            )}
          </p>
          {(status === 'error' || status === 'stale' || status === 'offline') && (
            <Button variant="outline" onClick={retry}>
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
