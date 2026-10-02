import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { Universe } from '@/components/universe/universe';
import { getPlanetSummaries } from '@/components/universe/universe-data';
import { routing } from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'Universe — lfmn',
  robots: { index: false, follow: false },
};

export default async function UniversePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const copy = await getMessages({ locale });
  return (
    <Universe
      copy={copy.universe}
      planets={getPlanetSummaries(copy.universe)}
      locale={locale}
      navigation={copy.nav}
    />
  );
}
