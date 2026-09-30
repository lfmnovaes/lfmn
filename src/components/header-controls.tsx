'use client';
import { Grid2X2, Moon, Rocket, Sun } from 'lucide-react';
import { useState } from 'react';
import { Github } from './brand-icons';
import { useLighting } from './site-shell';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
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
    <div className="header-controls">
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
        <TooltipProvider>
          <Tooltip open={wipOpen} onOpenChange={setWipOpen}>
            <TooltipTrigger
              render={<Button variant="ghost" className="mode-button wip-button" />}
              aria-disabled="true"
              aria-label={`${universe} — ${wip}`}
              onMouseEnter={() => setWipOpen(true)}
              onMouseLeave={() => setWipOpen(false)}
              onFocus={() => setWipOpen(true)}
              onBlur={() => setWipOpen(false)}
              onClick={() => setWipOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setWipOpen(false);
              }}
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
