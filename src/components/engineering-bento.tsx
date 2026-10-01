import {
  Activity,
  Braces,
  Check,
  Code2,
  Database,
  Gauge,
  Monitor,
  Server,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

import type { Locale } from '@/i18n/routing';
import type messages from '@/messages/en.json';

import { MarketPanel } from './market-panel';
import { ServiceFeed } from './service-feed';

export function EngineeringBento({
  copy,
  market,
  locale,
  controls,
}: {
  copy: typeof messages.engineering;
  market: typeof messages.market;
  locale: Locale;
  controls: typeof messages.motion;
}) {
  const icons = [Monitor, Server, ShieldCheck, Smartphone, Gauge, Activity];
  return (
    <section
      className="engineering-section content-section page-width"
      aria-labelledby="engineering-title"
    >
      <p className="eyebrow section-label">{copy.label}</p>
      <div className="section-heading">
        <h2 id="engineering-title">
          {copy.title}
          <br />
          <span className="section-accent">{copy.accent}</span>
        </h2>
        <p>{copy.intro}</p>
      </div>
      <div className="engineering-grid">
        <article className="bento-card service-card" aria-labelledby="service-title">
          <Code2 className="bento-icon" size={24} aria-hidden="true" />
          <h3 id="service-title">{copy.servicesTitle}</h3>
          <p className="bento-description">{copy.servicesIntro}</p>
          <ServiceFeed label={copy.servicesTitle} controls={controls}>
            <div className="service-track">
              {[false, true].map((duplicate) => (
                <ul
                  className={duplicate ? 'service-list service-duplicate' : 'service-list'}
                  aria-hidden={duplicate || undefined}
                  key={String(duplicate)}
                >
                  {copy.services.map((service, index) => {
                    const Icon = icons[index];
                    return (
                      <li
                        className="flex min-h-16 items-center gap-3 rounded-[10px] border border-border bg-background px-3 py-2.5"
                        key={service.title}
                      >
                        <span
                          className={`service-icon grid size-8.5 shrink-0 place-items-center rounded-[9px] text-primary service-color-${index}`}
                        >
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <div>
                          <strong>{service.title}</strong>
                          <span className="service-detail">{service.detail}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ))}
            </div>
          </ServiceFeed>
        </article>
        <article className="bento-card flow-card flex flex-col" aria-labelledby="flow-title">
          <Braces className="bento-icon" size={24} aria-hidden="true" />
          <h3 id="flow-title">{copy.flowTitle}</h3>
          <p className="bento-description">{copy.flowIntro}</p>
          <div className="system-flow">
            <svg
              className="flow-lines"
              viewBox="0 0 300 80"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <title>{copy.flowTitle}</title>
              <path d="M30 40 H270" className="flow-rail" />
              <path d="M30 40 H270" className="flow-packet" />
              <path d="M270 40 H30" className="flow-packet flow-response" />
            </svg>
            {[Monitor, Server, Database].map((Icon, index) => (
              <div className="flow-node relative text-center" key={copy.nodes[index]}>
                <span className="flow-icon">
                  <Icon size={23} aria-hidden="true" />
                </span>
                <strong>{copy.nodes[index]}</strong>
              </div>
            ))}
          </div>
          <div
            className="flow-payload mt-6 flex items-center justify-center gap-3 font-mono text-[10px] text-muted"
            aria-hidden="true"
          >
            <span>GET /api</span>
            <i />
            <span>200 OK</span>
          </div>
          <p className="flow-caption">{copy.flowCaption}</p>
        </article>
        <article className="bento-card quality-card" aria-labelledby="quality-title">
          <div className="max-w-122.5">
            <Check className="bento-icon" size={24} aria-hidden="true" />
            <h3 id="quality-title">{copy.qualityTitle}</h3>
            <p className="bento-description">{copy.qualityIntro}</p>
          </div>
          <div className="quality-window">
            <div className="quality-track">
              {[false, true].map((duplicate) => (
                <ul
                  className={duplicate ? 'quality-list quality-duplicate' : 'quality-list'}
                  aria-hidden={duplicate || undefined}
                  key={String(duplicate)}
                >
                  {copy.practices.map((practice) => (
                    <li
                      className="flex min-h-12 w-45 items-center justify-center gap-2.25 rounded-[9px] border border-border bg-background p-2.5 text-xs text-foreground"
                      key={practice}
                    >
                      <Check size={14} aria-hidden="true" />
                      {practice}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
          <p className="quality-note">{copy.qualityNote}</p>
        </article>
        <MarketPanel copy={market} locale={locale} />
      </div>
    </section>
  );
}
