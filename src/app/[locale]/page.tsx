import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ContactSection } from '@/components/contact-section';
import { EngineeringBento } from '@/components/engineering-bento';
import { ExperienceSection } from '@/components/experience-section';
import { HeaderControls, Wordmark } from '@/components/header-controls';
import { NameCover } from '@/components/name-cover';
import { PortraitPlaceholder } from '@/components/portrait-placeholder';
import { ResumeDownloads } from '@/components/resume-downloads';
import { RoleTypewriter } from '@/components/role-typewriter';
import { TechnologyStrip } from '@/components/technology-strip';
import { getSiteOrigin } from '@/lib/site-origin';

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
        <ExperienceSection copy={t.raw('experience')} />
        <ContactSection copy={t.raw('contact')} />
      </main>
      <footer className="site-footer page-width">
        <span className="wordmark">lfmn</span>
        <p>{t('contact.footer')}</p>
      </footer>
    </>
  );
}
