'use client';

import dynamic from 'next/dynamic';
import { catchError } from 'next/error';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ArrowLeft, ArrowRight, X } from 'lucide-react';

import { useUniverseControls } from '@/hooks/use-universe-controls';
import { useUniverseMotion } from '@/hooks/use-universe-motion';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import type messages from '@/messages/en.json';

import { HeaderNavigation } from '../header-controls';
import { Button } from '../ui/button';
import { PortalContainerContext } from '../ui/portal-container';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import styles from './universe.module.css';
import { UniverseControls } from './universe-controls';
import {
  DEFAULT_SIMULATION_SPEED,
  type PlanetSummary,
  SIMULATION_SPEEDS,
  type UniverseScale,
} from './universe-data';
import { UniverseFacts } from './universe-facts';
import type { AssetStatus } from './use-universe-textures';

const Scene = dynamic(() => import('./universe-scene'), { ssr: false, loading: () => null });
type UnavailableProps = { copy: Pick<typeof messages.universe, 'unavailable' | 'reload'> };
function SceneUnavailable({ copy }: UnavailableProps) {
  return (
    <div className={styles.notice}>
      <p role="status">{copy.unavailable}</p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        {copy.reload}
      </Button>
    </div>
  );
}
function SceneErrorFallback({
  copy,
  onUnavailable,
}: UnavailableProps & { onUnavailable: () => void }) {
  useEffect(() => onUnavailable(), [onUnavailable]);
  return <SceneUnavailable copy={copy} />;
}
const SceneBoundary = catchError(SceneErrorFallback);

export function Universe({
  copy,
  planets,
  locale,
  navigation,
}: {
  copy: typeof messages.universe;
  planets: PlanetSummary[];
  locale: Locale;
  navigation: Pick<typeof messages.nav, 'normal' | 'universe'>;
}) {
  const [support, setSupport] = useState<'pending' | 'available' | 'unavailable'>('pending');
  const [ready, setReady] = useState(false);
  const [assets, setAssets] = useState<AssetStatus>({ loading: true, failed: false });
  const [paused, setPaused] = useState(false);
  const [scale, setScale] = useState<UniverseScale>('artistic');
  const [speed, setSpeed] = useState(DEFAULT_SIMULATION_SPEED);
  const [open, setOpen] = useState(false);
  const surface = useRef<HTMLElement>(null);
  const stage = useRef<HTMLElement>(null);
  const callout = useRef<HTMLSpanElement>(null);
  const redraw = useRef(() => {});
  const { selected, select, advance, zoom, rotation, adjustZoom, rotate } = useUniverseControls(
    stage,
    ready && !open,
    redraw,
  );
  const { reduced, enableAnimations } = useUniverseMotion();
  const index = planets.findIndex(({ id }) => id === selected);
  const active = planets[index];
  const speeds = SIMULATION_SPEEDS.map(({ value, label }) => ({
    value,
    label: copy.speeds[label],
  }));
  const onReady = useCallback((invalidate: () => void) => {
    redraw.current = invalidate;
    setReady(true);
  }, []);
  const onAssets = useCallback((status: AssetStatus) => {
    setAssets((previous) =>
      previous.loading === status.loading && previous.failed === status.failed ? previous : status,
    );
  }, []);
  const onUnavailable = useCallback(() => {
    setReady(false);
    setSupport('unavailable');
    setAssets({ loading: false, failed: false });
    redraw.current = () => {};
  }, []);

  useEffect(() => {
    try {
      const context = document.createElement('canvas').getContext('webgl2');
      if (!context) {
        setSupport('unavailable');
        return;
      }
      context.getExtension('WEBGL_lose_context')?.loseContext();
      setSupport('available');
    } catch {
      setSupport('unavailable');
    }
  }, []);

  return (
    <PortalContainerContext value={surface}>
      <main ref={surface} className={styles.universe}>
        <a className="skip-link" href="#universe-summary">
          {copy.skipToFacts}
        </a>
        <header className={styles.header}>
          <span className={styles.wordmark} aria-hidden="true">
            lfmn
          </span>
          <HeaderNavigation locale={locale} mode="universe" {...navigation} />
        </header>
        <section ref={stage} className={styles.stage} aria-label={copy.scene}>
          <div className={styles.viewport}>
            {support === 'unavailable' ? (
              <SceneUnavailable copy={copy} />
            ) : (
              <SceneBoundary copy={copy} onUnavailable={onUnavailable}>
                {(!ready || assets.loading) && (
                  <div
                    className="market-loading-bar js-control"
                    role="progressbar"
                    aria-label={copy.loading}
                  />
                )}
                {!ready && (
                  <>
                    <p className={cn(styles.notice, 'js-control')} role="status">
                      {copy.loading}
                    </p>
                    <noscript>
                      <p className={styles.notice} role="status">
                        {copy.noJavaScript}
                      </p>
                    </noscript>
                  </>
                )}
                {support === 'available' && (
                  <Scene
                    selected={selected}
                    onSelect={select}
                    zoom={zoom}
                    rotation={rotation}
                    callout={callout}
                    locked={open}
                    paused={paused}
                    reduced={reduced}
                    scale={scale}
                    speed={speed}
                    onReady={onReady}
                    onAssets={onAssets}
                    onUnavailable={onUnavailable}
                  />
                )}
                <span ref={callout} className={styles.callout} aria-hidden="true" hidden>
                  {active.name}
                </span>
              </SceneBoundary>
            )}
            <UniverseControls
              copy={copy}
              disabled={!ready || open}
              reduced={reduced}
              paused={paused}
              scale={scale}
              onPause={() => {
                if (reduced) {
                  enableAnimations();
                  setPaused(false);
                } else setPaused((value) => !value);
              }}
              onScale={setScale}
              onZoom={adjustZoom}
              onRotate={rotate}
            />
          </div>
        </section>
        <div className={styles.hud}>
          <ToggleGroup
            className={cn(styles.planets, 'js-control')}
            aria-label={copy.planetNavigation}
            orientation="vertical"
            value={[selected]}
            onValueChange={([value]) => {
              if (value) select(value);
            }}
          >
            {planets.map(({ id, name }, planetIndex) => (
              <ToggleGroupItem className={styles.planet} value={id} key={id} aria-label={name}>
                <span className={styles.index} aria-hidden="true">
                  {String(planetIndex + 1).padStart(2, '0')}
                </span>
                <span className={styles.tick} aria-hidden="true" />
                <span>{name}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Sheet open={open} onOpenChange={setOpen}>
            <section
              id="universe-summary"
              tabIndex={-1}
              className={styles.summary}
              aria-labelledby="universe-title"
              aria-live="polite"
              aria-atomic="true"
            >
              <div key={selected} className={styles.summaryContent}>
                <p className="eyebrow">{active.kind}</p>
                <h1 id="universe-title">{active.name}</h1>
                <p>{active.summary}</p>
              </div>
              <SheetTrigger className="js-control" render={<Button variant="outline" />}>
                {copy.explore}
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </SheetTrigger>
            </section>
            <SheetContent>
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <p className="eyebrow">{active.kind}</p>
                  <SheetTitle className="text-2xl font-semibold">{active.name}</SheetTitle>
                </div>
                <SheetClose aria-label={copy.closeFacts} render={<Button variant="ghost" />}>
                  <X aria-hidden="true" />
                </SheetClose>
              </div>
              <SheetDescription className="text-muted">{active.summary}</SheetDescription>
              <UniverseFacts planet={active} copy={copy} />
            </SheetContent>
          </Sheet>
          <div className={styles.status}>
            <div className={cn(styles.travel, 'js-control')}>
              <Button
                variant="ghost"
                aria-label={copy.previous}
                disabled={index === 0}
                onClick={() => advance(-1)}
              >
                <ArrowLeft aria-hidden="true" />
              </Button>
              <span aria-hidden="true">
                {String(index + 1).padStart(2, '0')} / {String(planets.length).padStart(2, '0')}
              </span>
              <Button
                variant="ghost"
                aria-label={copy.next}
                disabled={index === planets.length - 1}
                onClick={() => advance(1)}
              >
                <ArrowRight aria-hidden="true" />
              </Button>
              <meter
                className={styles.progress}
                aria-label={copy.position}
                min={0}
                max={planets.length - 1}
                value={index}
                aria-valuetext={active.name}
              >
                {active.name}
              </meter>
            </div>
            <p id="universe-gestures" className={cn(styles.caption, 'js-control')}>
              {copy.gestures}
            </p>
            <p className={styles.caption}>
              {scale === 'realistic' ? copy.realistic : copy.illustrative}
            </p>
            <div className={styles.speed}>
              <span id="universe-speed-label" className={styles.caption}>
                {copy.timeScale}
              </span>
              <Select
                items={speeds}
                value={speed}
                disabled={!ready || open}
                onValueChange={(value) => {
                  if (value !== null) {
                    setSpeed(value);
                    if (reduced) {
                      enableAnimations();
                      setPaused(false);
                    }
                  }
                }}
              >
                <SelectTrigger aria-labelledby="universe-speed-label" className="js-control">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {speeds.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {reduced && (
              <div className={styles.motionPreference}>
                <p className={styles.caption}>{copy.reducedMotion}</p>
                <Button
                  variant="outline"
                  className="js-control"
                  onClick={() => {
                    enableAnimations();
                    setPaused(false);
                  }}
                >
                  {copy.enableMotion}
                </Button>
              </div>
            )}
            {assets.failed && (
              <p className={styles.caption} role="status">
                {copy.textureFallback}
              </p>
            )}
            <p className={styles.caption}>
              {copy.textureCredits}{' '}
              <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">
                Solar System Scope
              </a>{' '}
              (
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 4.0
              </a>
              ) ·{' '}
              <a
                href="https://www.jpl.nasa.gov/images/pia11707-pluto-color-map/"
                target="_blank"
                rel="noreferrer"
              >
                NASA/JHUAPL/SwRI
              </a>
            </p>
          </div>
          <noscript>
            <section className={styles.staticFacts} aria-label={copy.scene}>
              {planets.map((planet) => (
                <details key={planet.id}>
                  <summary>{planet.name}</summary>
                  <p>{planet.summary}</p>
                  <UniverseFacts planet={planet} copy={copy} />
                </details>
              ))}
            </section>
          </noscript>
        </div>
      </main>
    </PortalContainerContext>
  );
}
