import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) return [];
  return ['', '/pt-BR'].map((path) => ({
    url: `${origin}${path}`,
    alternates: { languages: { en: origin, 'pt-BR': `${origin}/pt-BR` } },
  }));
}
