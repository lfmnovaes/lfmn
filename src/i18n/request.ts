import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import type messages from '@/messages/en.json';

import { type Locale, routing } from './routing';

const messageLoaders = {
  en: () => import('../messages/en.json'),
  'pt-BR': () => import('../messages/pt-BR.json'),
} satisfies Record<Locale, () => Promise<{ default: typeof messages }>>;

export default getRequestConfig(async () => {
  const locale = await rootParams.locale();
  if (!hasLocale(routing.locales, locale)) notFound();
  return { locale, messages: (await messageLoaders[locale]()).default };
});
