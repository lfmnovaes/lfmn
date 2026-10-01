import { ArrowUpRight, Mail } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Github, Linkedin } from '@/components/brand-icons';
import { EngineeringBento } from '@/components/engineering-bento';
import { HeaderControls, Wordmark } from '@/components/header-controls';
import { NameCover } from '@/components/name-cover';
import { PortraitPlaceholder } from '@/components/portrait-placeholder';
import { ResumeDownloads } from '@/components/resume-downloads';
import { RoleTypewriter } from '@/components/role-typewriter';
import { TechnologyStrip } from '@/components/technology-strip';
import { getSiteOrigin } from '@/lib/site-origin';
import type messages from '@/messages/en.json';

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const origin = getSiteOrigin();
  const path = locale === 'en' ? '/' : '/pt-BR';
  const image = {
    url: locale === 'en' ? '/og-en.png' : '/og-pt-BR.png',
    width: 1200,
    height: 630,
    alt: t('title'),
  };
  return {
    title: t('title'),
    description: t('description'),
    metadataBase: new URL(origin || 'http://localhost:3000'),
    ...(origin
      ? {
          alternates: {
            canonical: path,
            languages: { en: '/', 'pt-BR': '/pt-BR', 'x-default': '/' },
          },
        }
      : {}),
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
      siteName: 'lfmn',
      url: origin ? path : undefined,
      locale: locale === 'en' ? 'en_US' : 'pt_BR',
      alternateLocale: locale === 'en' ? 'pt_BR' : 'en_US',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: [image],
    },
  };
}
export default async function Home({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const experience = t.raw('experience.items') as typeof messages.experience.items;
  return (
    <>
      <header className="site-header">
        <Wordmark
          href={locale === 'en' ? '/' : '/pt-BR'}
          label={locale === 'en' ? 'lfmn — Luis Fernando, home' : 'lfmn — Luis Fernando, início'}
        />
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
          <div className="hero-content min-w-0">
            <h1 id="hero-title">
              <span className="hero-greeting">{t('hero.greeting')}</span>
              <NameCover name={`${t('hero.first')} ${t('hero.last')}`} />
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
            {experience.map((item) => (
              <li key={item.company}>
                <span className="timeline-dot" aria-hidden="true" />
                <article className="employer-card">
                  <div className="timeline-meta mb-5 flex flex-wrap justify-between gap-2 font-mono text-[11px] leading-[1.6] text-muted">
                    <span>{item.date}</span>
                    <span>{item.mode}</span>
                  </div>
                  <h3>{item.company}</h3>
                  <p className="job-role">{item.role}</p>
                  <p>{item.body}</p>
                  {item.contributions.map((contribution) => (
                    <div className="employer-contribution" key={contribution.company}>
                      <p className="company-label">{contribution.company}</p>
                      <h4>{contribution.title}</h4>
                      <p>{contribution.body}</p>
                      <ul className="tags mt-5 flex list-none flex-wrap gap-2 p-0">
                        {contribution.tags.map((tag) => (
                          <li key={tag}>{tag}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </article>
              </li>
            ))}
          </ol>
        </section>
        <section className="contact-section page-width" aria-labelledby="contact-title">
          <div className="contact-intro">
            <p className="eyebrow section-label">{t('contact.label')}</p>
            <h2 id="contact-title">
              {t('contact.title')}
              <br />
              <span>{t('contact.accent')}</span>
            </h2>
            <p className="section-description">{t('contact.body')}</p>
          </div>
          <div className="contact-card">
            <a className="contact-email block" href="mailto:lfmnovaes@gmail.com">
              <span className="contact-invitation">
                <Mail size={18} />
                {t('contact.email')}
              </span>
              <span className="contact-address">
                lfmnovaes@gmail.com
                <ArrowUpRight size={22} />
              </span>
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
            </div>
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
