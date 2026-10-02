'use client';
import Link from 'next/link';
import { type ReactNode, useEffect, useRef } from 'react';

import { Grid2X2, Moon, Rocket, Sun } from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

import { Github } from './brand-icons';
import { useLighting } from './site-shell';
import { Button, buttonVariants } from './ui/button';
import { ButtonGroup } from './ui/button-group';
import styles from './ui/segmented-control.module.css';
import { SelectionIndicator } from './ui/selection-indicator';

export function Wordmark({ href, label }: { href: string; label: string }) {
  const frame = useRef(0);
  useEffect(() => {
    const cancel = () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('touchstart', cancel, { passive: true });
    window.addEventListener('keydown', cancel);
    return () => {
      cancel();
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('touchstart', cancel);
      window.removeEventListener('keydown', cancel);
    };
  }, []);
  return (
    <a
      href={href}
      className="wordmark"
      aria-label={label}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        cancelAnimationFrame(frame.current);
        const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 350;
        const from = window.scrollY;
        const started = performance.now();
        const step = (now: number) => {
          const progress = Math.min((now - started) / duration, 1);
          window.scrollTo({ top: from * (1 - progress) ** 3, behavior: 'instant' });
          frame.current = progress < 1 ? requestAnimationFrame(step) : 0;
        };
        frame.current = requestAnimationFrame(step);
      }}
    >
      lfmn
    </a>
  );
}

function ModeSwitch({
  locale,
  normal,
  universe,
  mode,
}: {
  locale: Locale;
  normal: string;
  universe: string;
  mode: 'normal' | 'universe';
}) {
  return (
    <ButtonGroup
      className="mode-switch"
      aria-label={locale === 'en' ? 'Site mode' : 'Modo do site'}
    >
      <SelectionIndicator index={mode === 'normal' ? 0 : 1} count={2} />
      <Link
        href={locale === 'en' ? '/' : '/pt-BR'}
        prefetch={false}
        aria-current={mode === 'normal' ? 'page' : undefined}
        aria-label={normal}
        className={cn(buttonVariants({ variant: 'ghost' }), 'mode-button')}
      >
        <Grid2X2 aria-hidden="true" />
        <span className="mode-label">{normal}</span>
      </Link>
      <Link
        href={`${locale === 'en' ? '' : '/pt-BR'}/universe`}
        prefetch={false}
        aria-current={mode === 'universe' ? 'page' : undefined}
        aria-label={universe}
        className={cn(buttonVariants({ variant: 'ghost' }), 'mode-button')}
      >
        <Rocket aria-hidden="true" />
        <span className="mode-label">{universe}</span>
      </Link>
    </ButtonGroup>
  );
}

function LanguageSwitch({ locale, mode }: { locale: Locale; mode: 'normal' | 'universe' }) {
  const path = mode === 'universe' ? '/universe' : '';
  return (
    <nav
      className={`locale-switch ${styles.group}`}
      aria-label={locale === 'en' ? 'Language' : 'Idioma'}
    >
      <SelectionIndicator index={locale === 'en' ? 0 : 1} count={2} />
      <a
        href={path || '/'}
        lang="en"
        hrefLang="en"
        aria-current={locale === 'en' ? 'page' : undefined}
      >
        EN
      </a>
      <a
        href={`/pt-BR${path}`}
        lang="pt-BR"
        hrefLang="pt-BR"
        aria-current={locale === 'pt-BR' ? 'page' : undefined}
      >
        PT
      </a>
    </nav>
  );
}

export function HeaderNavigation({
  locale,
  normal,
  universe,
  mode,
  children,
}: {
  locale: Locale;
  normal: string;
  universe: string;
  mode: 'normal' | 'universe';
  children?: ReactNode;
}) {
  return (
    <div className="header-controls ml-auto flex items-center gap-2">
      <ModeSwitch locale={locale} normal={normal} universe={universe} mode={mode} />
      <a
        href="https://github.com/lfmnovaes"
        target="_blank"
        rel="noreferrer"
        className="header-icon"
        aria-label="GitHub"
        title="GitHub"
      >
        <Github size={18} aria-hidden="true" />
      </a>
      {children}
      <LanguageSwitch locale={locale} mode={mode} />
    </div>
  );
}

export function HeaderControls({
  locale,
  normal,
  universe,
  lightsOn,
  lightsOff,
  skip,
}: {
  locale: Locale;
  normal: string;
  universe: string;
  lightsOn: string;
  lightsOff: string;
  skip: string;
}) {
  const { lights, toggleLights } = useLighting();
  return (
    <>
      <button
        className="skip-link js-control"
        type="button"
        onClick={() => document.querySelector('main')?.focus()}
      >
        {skip}
      </button>
      <HeaderNavigation locale={locale} normal={normal} universe={universe} mode="normal">
        <Button
          variant="ghost"
          className="header-icon js-control"
          aria-label={lights ? lightsOff : lightsOn}
          title={lights ? lightsOff : lightsOn}
          aria-pressed={lights}
          onClick={(event) => toggleLights(event.currentTarget)}
        >
          {lights ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
      </HeaderNavigation>
    </>
  );
}
