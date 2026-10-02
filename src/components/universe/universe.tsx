'use client';

import dynamic from 'next/dynamic';
import { catchError } from 'next/error';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Minus,
  Pause,
  Play,
  Plus,
  X,
} from 'lucide-react';

import { useUniverseControls } from '@/hooks/use-universe-controls';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import type messages from '@/messages/en.json';

import { HeaderNavigation } from '../header-controls';
import { Button } from '../ui/button';
import { PortalContainerContext } from '../ui/portal-container';
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
import type { PlanetSummary } from './universe-data';
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

function subscribeToMotion(change: () => void) {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', change);
  return () => media.removeEventListener('change', change);
}
const motionPreference = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  const reduced = useSyncExternalStore(subscribeToMotion, motionPreference, () => true);
  const index = planets.findIndex(({ id }) => id === selected);
  const active = planets[index];
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
          <div>
            <span className="wordmark">lfmn</span>
            <p className="eyebrow">{copy.title}</p>
          </div>
          <HeaderNavigation locale={locale} mode="universe" {...navigation} />
        </header>
        <section ref={stage} className={styles.stage} aria-label={copy.scene}>
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
                  reduced={reduced || paused}
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
          <fieldset
            className={cn(styles.controls, 'js-control')}
            aria-label={copy.controls}
            disabled={!ready || open}
          >
            <Button variant="outline" aria-label={copy.zoomIn} onClick={() => adjustZoom(0.8)}>
              <Plus aria-hidden="true" />
            </Button>
            <Button variant="outline" aria-label={copy.zoomOut} onClick={() => adjustZoom(1.25)}>
              <Minus aria-hidden="true" />
            </Button>
            {!reduced && (
              <Button
                variant="outline"
                aria-label={paused ? copy.resume : copy.pause}
                aria-pressed={paused}
                onClick={() => setPaused((value) => !value)}
              >
                {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
              </Button>
            )}
            <Button variant="outline" aria-label={copy.rotateLeft} onClick={() => rotate(-0.25, 0)}>
              <ArrowLeft aria-hidden="true" />
            </Button>
            <Button variant="outline" aria-label={copy.rotateRight} onClick={() => rotate(0.25, 0)}>
              <ArrowRight aria-hidden="true" />
            </Button>
            <Button variant="outline" aria-label={copy.rotateUp} onClick={() => rotate(0, -0.25)}>
              <ArrowUp aria-hidden="true" />
            </Button>
            <Button variant="outline" aria-label={copy.rotateDown} onClick={() => rotate(0, 0.25)}>
              <ArrowDown aria-hidden="true" />
            </Button>
          </fieldset>
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
            <p className={cn(styles.caption, 'js-control')}>{copy.gestures}</p>
            <p className={styles.caption}>{copy.illustrative}</p>
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
