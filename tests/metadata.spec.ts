import { expect, test } from '@playwright/test';

import robots from '../src/app/robots';
import sitemap from '../src/app/sitemap';
import { getSiteOrigin } from '../src/lib/site-origin';

test('site origin is checked and shared by sitemap and robots, including Vercel fallback', () => {
  expect(getSiteOrigin({})).toBeUndefined();
  expect(getSiteOrigin({ NEXT_PUBLIC_SITE_URL: 'https://lfmn.example/' })).toBe(
    'https://lfmn.example',
  );
  expect(getSiteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: 'lfmn.example' })).toBe(
    'https://lfmn.example',
  );
  expect(
    getSiteOrigin({
      NEXT_PUBLIC_SITE_URL: 'https://custom.example',
      VERCEL_PROJECT_PRODUCTION_URL: 'lfmn.example',
    }),
  ).toBe('https://custom.example');
  for (const url of [
    'invalid',
    'ftp://lfmn.example',
    'https://user:password@lfmn.example',
    'https://lfmn.example/path',
    'https://lfmn.example?x=1',
    'https://lfmn.example/#section',
  ]) {
    expect(() => getSiteOrigin({ NEXT_PUBLIC_SITE_URL: url })).toThrow();
  }
  const previous = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  };
  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    expect(sitemap()).toEqual([]);
    expect(robots().sitemap).toBeUndefined();
    for (const key of Object.keys(previous)) {
      process.env[key] = key === 'NEXT_PUBLIC_SITE_URL' ? 'https://lfmn.example/' : 'lfmn.example';
      expect(robots().sitemap).toBe('https://lfmn.example/sitemap.xml');
      expect(sitemap()).toEqual([
        {
          url: 'https://lfmn.example',
          alternates: {
            languages: { en: 'https://lfmn.example', 'pt-BR': 'https://lfmn.example/pt-BR' },
          },
        },
        {
          url: 'https://lfmn.example/pt-BR',
          alternates: {
            languages: { en: 'https://lfmn.example', 'pt-BR': 'https://lfmn.example/pt-BR' },
          },
        },
      ]);
      delete process.env[key];
    }
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

for (const locale of ['en', 'pt-BR']) {
  test(`${locale}: social metadata references localized static previews and dotless identity`, async ({
    page,
    request,
  }) => {
    await page.goto(locale === 'en' ? '/' : '/pt-BR');
    const preview = `/og-${locale}.png`;
    const origin = getSiteOrigin() || 'http://localhost:3000';
    if (getSiteOrigin()) {
      const path = locale === 'en' ? '' : '/pt-BR';
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `${origin}${path}`,
      );
      await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', origin);
      await expect(page.locator('link[hreflang="pt-BR"]')).toHaveAttribute(
        'href',
        `${origin}/pt-BR`,
      );
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        'content',
        `${origin}${path}`,
      );
      expect(await (await request.get('/robots.txt')).text()).toContain(`${origin}/sitemap.xml`);
      const map = await (await request.get('/sitemap.xml')).text();
      expect(map).toContain(`<loc>${origin}</loc>`);
      expect(map).toContain(`<loc>${origin}/pt-BR</loc>`);
      expect(map).not.toContain(`${origin}//`);
    } else {
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
      expect(await (await request.get('/sitemap.xml')).text()).not.toContain('<loc>');
    }
    for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
      await expect(page.locator(selector)).toHaveAttribute('content', `${origin}${preview}`);
    }
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'lfmn');
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      'content',
      locale === 'en' ? 'en_US' : 'pt_BR',
    );
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      'content',
      /Luis Fernando/,
    );
    await expect(page.locator('meta[name="author"]')).toHaveAttribute(
      'content',
      'Luis Fernando Magalhães Novaes',
    );
    const image = await request.get(preview);
    expect(image.ok()).toBe(true);
    expect(image.headers()['content-type']).toContain('image/png');
    const bytes = await image.body();
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(bytes.readUInt32BE(16)).toBe(1200);
    expect(bytes.readUInt32BE(20)).toBe(630);
    const icon = await request.get('/icon.svg');
    expect(icon.ok()).toBe(true);
    expect(icon.headers()['content-type']).toContain('image/svg+xml');
  });
}
