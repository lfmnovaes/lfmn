'use client';
import { Grid2X2, Moon, Rocket, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Github } from './brand-icons';
import { useLighting } from './site-shell';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

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

export function HeaderControls({
  locale,
  normal,
  universe,
  wip,
  lightsOn,
  lightsOff,
  skip,
}: {
  locale: string;
  normal: string;
  universe: string;
  wip: string;
  lightsOn: string;
  lightsOff: string;
  skip: string;
}) {
  const { lights, toggleLights } = useLighting();
  const [wipOpen, setWipOpen] = useState(false);
  return (
    <div className="header-controls ml-auto flex items-center gap-2">
      <button
        className="skip-link js-control"
        type="button"
        onClick={() => document.querySelector('main')?.focus()}
      >
        {skip}
      </button>
      <fieldset className="mode-switch" aria-label={locale === 'en' ? 'Site mode' : 'Modo do site'}>
        <Button variant="ghost" aria-pressed="true" aria-label={normal} className="mode-button">
          <Grid2X2 aria-hidden="true" />
          <span className="mode-label">{normal}</span>
        </Button>
        <TooltipProvider delay={0} closeDelay={0}>
          <Tooltip open={wipOpen} onOpenChange={setWipOpen} disableHoverablePopup>
            <TooltipTrigger
              render={<Button variant="ghost" className="mode-button wip-button" />}
              aria-disabled="true"
              aria-label={`${universe} — ${wip}`}
              closeOnClick={false}
              onMouseEnter={() => setWipOpen(true)}
              onMouseLeave={() => setWipOpen(false)}
              onClick={() => setWipOpen(true)}
            >
              <Rocket aria-hidden="true" />
              <span className="mode-label">{universe}</span>
            </TooltipTrigger>
            <TooltipContent>{wip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </fieldset>
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
      <fieldset className="locale-switch" aria-label={locale === 'en' ? 'Language' : 'Idioma'}>
        <a href="/" lang="en" hrefLang="en" aria-current={locale === 'en' ? 'page' : undefined}>
          EN
        </a>
        <span aria-hidden="true">/</span>
        <a
          href="/pt-BR"
          lang="pt-BR"
          hrefLang="pt-BR"
          aria-current={locale === 'pt-BR' ? 'page' : undefined}
        >
          PT
        </a>
      </fieldset>
    </div>
  );
}
