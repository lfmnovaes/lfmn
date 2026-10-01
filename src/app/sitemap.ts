import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '@/lib/site-origin';
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  if (!origin) return [];
  return ['', '/pt-BR'].map((path) => ({
    url: `${origin}${path}`,
    alternates: { languages: { en: origin, 'pt-BR': `${origin}/pt-BR` } },
  }));
}
