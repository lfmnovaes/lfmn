import { ArrowRight, ArrowUpRight, Braces, Layers3, Mail, MoveUpRight } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Github, Linkedin } from '@/components/brand-icons';
import { EngineeringBento } from '@/components/engineering-bento';
import { HeaderControls } from '@/components/header-controls';
import { PortraitPlaceholder } from '@/components/portrait-placeholder';
import { ResumeDownloads } from '@/components/resume-downloads';
import { RoleTypewriter } from '@/components/role-typewriter';
import { TechnologyStrip } from '@/components/technology-strip';
import type messages from '@/messages/en.json';

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);
  return {
    title: t('title'),
    description: t('description'),
    metadataBase: new URL(origin || 'http://localhost:3000'),
    ...(origin
      ? {
          metadataBase: new URL(origin),
          alternates: {
            canonical: locale === 'en' ? '/' : '/pt-BR',
            languages: { en: '/', 'pt-BR': '/pt-BR', 'x-default': '/' },
          },
        }
      : {}),
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'pt_BR',
      images: [{ url: locale === 'en' ? '/og-en.png' : '/og-pt-BR.png', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: t('title'), description: t('description') },
  };
}
export default async function Home({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const contributions = t.raw('work.items') as typeof messages.work.items;
  const experience = t.raw('experience.items') as typeof messages.experience.items;
  return (
    <>
      <header className="site-header">
        <a
          href={locale === 'en' ? '/' : '/pt-BR'}
          className="wordmark"
          aria-label={
            locale === 'en' ? 'lfmn — Luis Fernando, home' : 'lfmn — Luis Fernando, início'
          }
        >
          lfmn
        </a>
        <HeaderControls
          locale={locale}
          normal={t('nav.normal')}
          universe={t('nav.universe')}
          wip={t('nav.wip')}
          lightsOn={t('nav.lightsOn')}
          lightsOff={t('nav.lightsOff')}
          skip={t('nav.skip')}
        />
      </header>
      <main tabIndex={-1}>
        <section className="hero page-width" aria-labelledby="hero-title">
          <div className="hero-content">
            <h1 id="hero-title">
              <span className="hero-greeting">{t('hero.greeting')}</span>
              <span className="name-cover">
                <span className="name-beams" aria-hidden="true" />
                <span className="display-name">
                  {t('hero.first')} {t('hero.last')}
                </span>
              </span>
            </h1>
            <RoleTypewriter roles={t.raw('hero.roles')} />
            <div className="experience-card">
              <p className="hero-position">{t('hero.experience')}</p>
              <p className="hero-description">{t('hero.description')}</p>
            </div>
            <ResumeDownloads
              label={t('hero.downloads')}
              english={t('hero.resumeEn')}
              portuguese={t('hero.resumePt')}
            />
          </div>
          <PortraitPlaceholder
            label={t('hero.portrait')}
            note={t('hero.portraitNote')}
            badges={t.raw('hero.badges')}
          />
        </section>
        <TechnologyStrip
          title={t('technologies.title')}
          intro={t('technologies.intro')}
          categories={t.raw('technologies.categories')}
          instructions={t('technologies.instructions')}
        />
        <EngineeringBento copy={t.raw('engineering')} market={t.raw('market')} locale={locale} />
        <section className="content-section page-width" aria-labelledby="work-title">
          <p className="eyebrow section-label">{t('work.label')}</p>
          <div className="section-heading">
            <h2 id="work-title">
              {t('work.title')}
              <br />
              <span>{t('work.accent')}</span>
            </h2>
            <p>{t('work.intro')}</p>
          </div>
          <div className="contribution-grid">
            {contributions.map((item, i) => {
              const Icon = [Layers3, MoveUpRight, Braces][i];
              return (
                <article className="contribution" key={item.company}>
                  <div className="contribution-top">
                    <Icon size={23} strokeWidth={1.3} />
                  </div>
                  <p className="company-label">{item.company}</p>
                  <h3>{item.title}</h3>
                  <p className="contribution-body">{item.body}</p>
                  <ul className="tags">
                    {item.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
        <section
          className="content-section page-width experience-section"
          aria-labelledby="experience-title"
        >
          <div className="experience-intro">
            <p className="eyebrow section-label">{t('experience.label')}</p>
            <h2 id="experience-title">{t('experience.title')}</h2>
            <p className="section-description">{t('experience.intro')}</p>
          </div>
          <ol className="timeline">
            {experience.map((item, i) => (
              <li key={item.company}>
                <span
                  className={`timeline-dot ${i === 0 ? 'current-dot' : ''}`}
                  aria-hidden="true"
                />
                <div className="timeline-meta">
                  <span>{item.date}</span>
                  <span>{item.mode}</span>
                </div>
                <h3>{item.company}</h3>
                <p className="job-role">{item.role}</p>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="contact-section page-width" aria-labelledby="contact-title">
          <p className="eyebrow section-label">{t('contact.label')}</p>
          <h2 id="contact-title">
            {t('contact.title')}
            <br />
            <span>{t('contact.accent')}</span>
          </h2>
          <p>{t('contact.body')}</p>
          <a className="contact-email" href="mailto:lfmnovaes@gmail.com">
            lfmnovaes@gmail.com
            <ArrowUpRight />
          </a>
          <div className="contact-socials">
            <a href="https://github.com/lfmnovaes" target="_blank" rel="noreferrer">
              <Github size={17} />
              GitHub
              <ArrowUpRight size={13} />
            </a>
            <a href="https://www.linkedin.com/in/lfmnovaes/" target="_blank" rel="noreferrer">
              <Linkedin size={17} />
              LinkedIn
              <ArrowUpRight size={13} />
            </a>
            <a href="mailto:lfmnovaes@gmail.com">
              <Mail size={17} />
              {t('contact.email')}
              <ArrowRight size={13} />
            </a>
          </div>
        </section>
      </main>
      <footer className="site-footer page-width">
        <span className="wordmark">lfmn</span>
        <p>{t('contact.footer')}</p>
      </footer>
    </>
  );
}
