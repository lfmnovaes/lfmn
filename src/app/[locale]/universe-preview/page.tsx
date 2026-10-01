import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { getPlanetSummaries } from '@/components/universe/universe-data';
import { UniversePreview } from '@/components/universe/universe-preview';
import { routing } from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'Universe preview — lfmn',
  robots: { index: false, follow: false },
};

export default async function UniversePreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const copy = await getMessages({ locale });
  return (
    <UniversePreview
      copy={copy.universe}
      planets={getPlanetSummaries(copy.universe)}
      locale={locale}
      navigation={copy.nav}
    />
  );
}
