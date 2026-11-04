#!/usr/bin/env node
/*
 * Makes the link-preview images (1200x630) that WhatsApp, Facebook, LinkedIn etc. show
 * when someone shares the site:  public/assets/img/og-ro.jpg  and  og-en.jpg  (JPEG keeps each under ~100 KB; WhatsApp ignores big previews)
 *
 *   node tools/make-og.js        (needs Playwright + Chromium)
 *
 * The words come from the canvas (hero lines and kicker), so they stay in step with the page.
 * Run tools/build-static.js afterwards so the pages pick the images up.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PUB = path.join(ROOT, 'public');
const canvas = require('./lib/canvas')(path.join(ROOT, 'project', 'Main.dc.html'));

const b64 = (rel, mime) => 'data:' + mime + ';base64,' + fs.readFileSync(path.join(PUB, rel)).toString('base64');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const FONTS = [
  ['Bricolage Grotesque', '200 800', '75% 100%', 'assets/fonts/bricolage-grotesque-latin-standard-normal.woff2', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122'],
  ['Bricolage Grotesque', '200 800', '75% 100%', 'assets/fonts/bricolage-grotesque-latin-ext-standard-normal.woff2', 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F'],
  ['Figtree', '300 900', '', 'assets/fonts/figtree-latin-wght-normal.woff2', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122'],
  ['Figtree', '300 900', '', 'assets/fonts/figtree-latin-ext-wght-normal.woff2', 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F']
];

function html(t) {
  const faces = FONTS.map((f) => '@font-face{font-family:\'' + f[0] + '\';font-weight:' + f[1] + ';' + (f[2] ? 'font-stretch:' + f[2] + ';' : '') +
    'src:url(' + b64(f[3], 'font/woff2') + ') format(\'woff2\');unicode-range:' + f[4] + '}').join('\n');
  return '<!doctype html><meta charset="utf-8"><style>' + faces + `
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;background:#0c0913;overflow:hidden}
.c{position:relative;width:1200px;height:630px;padding:64px 80px;color:#f3eff9;font-family:'Figtree',system-ui,sans-serif;
  background:radial-gradient(700px 520px at 88% 12%,rgba(181,124,255,.34),transparent 70%),radial-gradient(520px 420px at 6% 108%,rgba(201,157,244,.16),transparent 70%),#0c0913}
.c::after{content:"";position:absolute;inset:18px;border:1px solid rgba(255,255,255,.09);border-radius:30px;pointer-events:none}
.lg{display:block;height:96px;width:auto}
.k{margin-top:46px;display:flex;align-items:center;gap:14px;font-weight:600;font-size:28px;color:#c99df4}
.k i{width:12px;height:12px;border-radius:50%;background:#c99df4;box-shadow:0 0 0 6px rgba(201,157,244,.16),0 0 22px 3px rgba(201,157,244,.7)}
h1{margin-top:18px;font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-stretch:88%;font-optical-sizing:auto;letter-spacing:-.032em;line-height:1.02;font-size:104px}
h1 span{display:block}
h1 span:last-child{color:#c99df4}
.u{position:absolute;right:80px;bottom:56px;font-weight:700;font-size:30px;letter-spacing:.01em;color:#ecd2fc}
</style><div class="c"><img class="lg" src="` + b64('assets/img/shine-logo.webp', 'image/webp') + `" alt="">
<p class="k"><i></i>` + esc(t.site_uri_pentru_afaceri) + `</p>
<h1><span>` + esc(t.site_ul_tau) + `</span><span>` + esc(t.intai_il_vezi) + `</span><span>` + esc(t.apoi_decizi) + `</span></h1>
<p class="u">shinedigital.ro</p></div>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const lang of ['ro', 'en']) {
    await page.setContent(html(canvas.valsFor(lang).dict[lang]));
    await page.evaluate(() => document.fonts.ready);
    const ok = await page.evaluate(() => document.fonts.check('700 40px "Bricolage Grotesque"'));
    if (!ok) { console.error('Fonts did not load'); process.exit(1); }
    const out = path.join(PUB, 'assets', 'img', 'og-' + lang + '.jpg');
    await page.screenshot({ path: out, type: 'jpeg', quality: 90 });
    console.log('wrote ' + path.relative(ROOT, out) + ' (' + fs.statSync(out).size + ' bytes)');
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
