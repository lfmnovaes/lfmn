'use client';

import dynamic from 'next/dynamic';
import { catchError } from 'next/error';
import { type ReactNode, useCallback, useRef, useState, useSyncExternalStore } from 'react';

import { Minus, Pause, Play, Plus } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import type messages from '@/messages/en.json';

import { Button, buttonVariants } from '../ui/button';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import type { PlanetId, PlanetSummary } from './universe-data';
import styles from './universe-preview.module.css';

const Scene = dynamic(() => import('./universe-scene'), { ssr: false, loading: () => null });
const SceneBoundary = catchError(({ unavailable }: { unavailable: string }) => (
  <p className={styles.notice} role="status">
    {unavailable}
  </p>
));

function subscribeToMotion(change: () => void) {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', change);
  return () => media.removeEventListener('change', change);
}
const motionPreference = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function UniversePreview({
  copy,
  planets,
  locale,
  children,
}: {
  copy: typeof messages.universe;
  planets: PlanetSummary[];
  locale: Locale;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<PlanetId>('sun');
  const [started, setStarted] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const zoom = useRef(1);
  const redraw = useRef(() => {});
  const reduced = useSyncExternalStore(subscribeToMotion, motionPreference, () => true);
  const active = planets.find(({ id }) => id === selected) ?? planets[0];
  const onReady = useCallback((invalidate: () => void) => {
    redraw.current = invalidate;
    setReady(true);
  }, []);

  function enter() {
    try {
      const context = document.createElement('canvas').getContext('webgl2');
      if (!context) {
        setUnsupported(true);
        return;
      }
      context.getExtension('WEBGL_lose_context')?.loseContext();
      setStarted(true);
    } catch {
      setUnsupported(true);
    }
  }

  function adjustZoom(factor: number) {
    zoom.current = Math.min(2.5, Math.max(0.65, zoom.current * factor));
    redraw.current();
  }

  return (
    <main className={styles.preview}>
      <header className={styles.header}>
        <div>
          <span className="wordmark">lfmn</span>
          <p className="eyebrow">{copy.preview}</p>
        </div>
        <nav className={styles.links} aria-label={copy.navigation}>
          <a
            href="/universe-preview"
            lang="en"
            hrefLang="en"
            aria-current={locale === 'en' ? 'page' : undefined}
          >
            EN
          </a>
          <a
            href="/pt-BR/universe-preview"
            lang="pt-BR"
            hrefLang="pt-BR"
            aria-current={locale === 'pt-BR' ? 'page' : undefined}
          >
            PT
          </a>
          <a href="https://github.com/lfmnovaes" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a
            href={locale === 'en' ? '/' : '/pt-BR'}
            className={buttonVariants({ variant: 'outline' })}
          >
            {copy.returnNormal}
          </a>
        </nav>
      </header>
      <section className={styles.stage} aria-label={copy.scene}>
        {unsupported ? (
          <p className={styles.notice} role="status">
            {copy.unavailable}
          </p>
        ) : started ? (
          <SceneBoundary unavailable={copy.unavailable}>
            {!ready && (
              <>
                <div className="market-loading-bar" role="progressbar" aria-label={copy.loading} />
                <p className={styles.notice} role="status">
                  {copy.loading}
                </p>
              </>
            )}
            <Scene
              selected={selected}
              onSelect={setSelected}
              zoom={zoom}
              reduced={reduced || paused}
              onReady={onReady}
            />
          </SceneBoundary>
        ) : (
          <div className={styles.notice}>
            <p>{copy.intro}</p>
            <Button className="js-control" onClick={enter}>
              {copy.enter}
            </Button>
            <noscript>
              <p>{copy.noJavaScript}</p>
            </noscript>
          </div>
        )}
        <fieldset
          className={`${styles.zoom} js-control`}
          aria-label={copy.controls}
          disabled={!ready}
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
        </fieldset>
      </section>
      <div className={styles.hud}>
        <ToggleGroup
          className={`${styles.planets} js-control`}
          aria-label={copy.planetNavigation}
          value={[selected]}
          onValueChange={([value]) => {
            if (value) setSelected(value);
          }}
        >
          {planets.map(({ id, name }) => (
            <ToggleGroupItem className={styles.planet} value={id} key={id}>
              {name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <section
          className={styles.summary}
          aria-labelledby="universe-title"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="eyebrow">{active.name}</p>
          <h1 id="universe-title">{active.title}</h1>
          <p>{active.summary}</p>
          {selected === 'sun' && children}
        </section>
        <p className={styles.caption}>{copy.illustrative}</p>
      </div>
    </main>
  );
}
