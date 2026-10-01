'use client';

import { useMemo, useState } from 'react';

import { RefreshCw } from 'lucide-react';

import { useMarketChart } from '@/hooks/use-market-chart';
import type { Locale } from '@/i18n/routing';
import {
  MARKET_INTERVAL_OPTIONS,
  MARKET_OPTIONS,
  MARKET_SYMBOLS,
  type MarketRequest,
} from '@/lib/market-data';
import type messages from '@/messages/en.json';

import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { SelectionIndicator } from './ui/selection-indicator';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

export function MarketPanel({ copy, locale }: { copy: typeof messages.market; locale: Locale }) {
  const [request, setRequest] = useState<MarketRequest>({ symbol: 'PAXGUSDT', interval: '1m' });
  const { symbol, interval } = request;
  const { panel, canvas, current, status, loading } = useMarketChart(request);
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
          <Select
            items={MARKET_OPTIONS}
            value={symbol}
            onValueChange={(value) => {
              if (value && Object.hasOwn(MARKET_SYMBOLS, value))
                setRequest((current) => ({ ...current, symbol: value }));
            }}
          >
            <SelectTrigger id="market-symbol">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {MARKET_OPTIONS.map(({ value, label }) => (
                  <SelectItem value={value} key={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <ToggleGroup
            className="market-intervals"
            aria-label={copy.interval}
            value={[interval]}
            onValueChange={([value]) => {
              if (value) setRequest((current) => ({ ...current, interval: value }));
            }}
          >
            <SelectionIndicator index={MARKET_INTERVAL_OPTIONS.indexOf(interval)} count={3} />
            {MARKET_INTERVAL_OPTIONS.map((value) => (
              <ToggleGroupItem key={value} value={value}>
                {value}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="market-price">
          <strong data-testid="market-price">
            {current ? formatters.price.format(current.candle.close) : '—'}
          </strong>
          <span className="market-currency">USDT</span>
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
            <Button variant="outline" onClick={() => setRequest((current) => ({ ...current }))}>
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
