import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { SiteShell } from '@/components/site-shell';
import { routing } from '@/i18n/routing';
import '../globals.css';

const geist = localFont({
  src: '../../../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2',
  variable: '--font-geist',
  display: 'swap',
});
const display = localFont({
  src: '../../../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2',
  variable: '--font-display',
  display: 'swap',
});
export const metadata: Metadata = {
  applicationName: 'lfmn',
  authors: [{ name: 'Luis Fernando Magalhães Novaes' }],
  creator: 'Luis Fernando Magalhães Novaes',
};
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return (
    <html lang={locale} className={`${geist.variable} ${display.variable}`}>
      <head>
        {/* Cross-document opt-in must be available before external styles load. */}
        <style>{'@view-transition { navigation: auto; types: locale; }'}</style>
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
        <Analytics />
        <SpeedInsights />
        <noscript>
          <style>{`
            .js-control { display: none }
            .technology-viewport { cursor: auto; user-select: text; touch-action: auto }
            [data-motion] .technology-track, [data-motion] .service-track, [data-motion] .quality-track { display: block; width: auto; animation: none; transform: none }
            [data-motion] .technology-group { display: grid; padding-right: 0 }
            [data-motion] .technology-card { width: auto }
            [data-motion] .technology-duplicate, [data-motion] .service-duplicate, [data-motion] .quality-duplicate, [data-motion] .technology-viewport::before, [data-motion] .technology-viewport::after { display: none }
            [data-motion] .service-feed { height: auto }
            .quality-list { flex-wrap: wrap; padding: 0 }
            .quality-list li { width: auto; flex: 1 1 180px }
            .quality-window { margin-inline: 0 }
            .market-controls { display: none }
          `}</style>
        </noscript>
      </body>
    </html>
  );
}
