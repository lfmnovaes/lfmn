import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
const font = async (packageName) =>
  (
    await readFile(
      new URL(
        `node_modules/@fontsource-variable/${packageName}/files/${packageName}-latin-wght-normal.woff2`,
        root,
      ),
    )
  ).toString('base64');
const mesh = (await readFile(new URL('public/mesh.svg', root))).toString('base64');
const [geist, display] = await Promise.all([font('geist'), font('space-grotesk')]);
const escapeHtml = (text) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  for (const locale of ['en', 'pt-BR']) {
    const { hero, technologies } = JSON.parse(
      await readFile(new URL(`src/messages/${locale}.json`, root), 'utf8'),
    );
    await page.setContent(`<!doctype html><html lang="${locale}"><head><style>
      @font-face { font-family: Geist; src: url(data:font/woff2;base64,${geist}); font-weight: 100 900 }
      @font-face { font-family: Display; src: url(data:font/woff2;base64,${display}); font-weight: 300 700 }
      * { box-sizing: border-box }
      body { margin: 0; width: 1200px; height: 630px; color: #f0f1f7; background: #090a0e; font-family: Geist, sans-serif }
      body::before { content: ''; position: absolute; inset: 0; background: url(data:image/svg+xml;base64,${mesh}) 0 0 / 400px; opacity: .6 }
      main { position: relative; height: 100%; padding: 52px 64px; display: flex; flex-direction: column; align-items: flex-start }
      .wordmark { font: 550 32px Display; letter-spacing: .07em; margin-bottom: 46px }
      .greeting { font-size: 24px; color: #b4b8ca; margin-bottom: 12px }
      h1 { margin: 0; padding: 6px 16px 12px; font: 550 76px / 1.1 Display; letter-spacing: .015em; border-radius: 12px; background: #27315c99 }
      .role { margin-top: 22px; padding: 14px 20px; font-size: 26px; border: 1px solid #343744; border-radius: 10px; background: #171922a6 }
      .caret { color: #b3bfff; margin-left: 8px }
      .description { max-width: 880px; margin: 26px 0 0; color: #b4b8ca; font-size: 22px; line-height: 1.5 }
      footer { width: 100%; margin-top: auto; display: flex; justify-content: space-between; padding-top: 20px; font-size: 17px; color: #b4b8ca; border-top: 1px solid #343744 }
    </style></head><body><main>
      <div class="wordmark">lfmn</div><div class="greeting">${escapeHtml(hero.greeting)}</div>
      <h1>${escapeHtml(`${hero.first} ${hero.last}`)}</h1>
      <div class="role">${escapeHtml(hero.roles[0])}<span class="caret">|</span></div>
      <p class="description">${escapeHtml(hero.description)}</p>
      <footer><span>${escapeHtml(technologies.title)}</span><span>github.com/lfmnovaes</span></footer>
    </main></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: fileURLToPath(new URL(`public/og-${locale}.png`, root)) });
    console.log(`Generated og-${locale}.png (1200 × 630)`);
  }
} finally {
  await browser.close();
}
