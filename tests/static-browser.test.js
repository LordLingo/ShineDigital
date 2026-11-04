#!/usr/bin/env node
/*
 * Browser test for the built site in public/ (needs Playwright + Chromium).
 *
 *   node tests/static-browser.test.js            run everything
 *   node tests/static-browser.test.js --shots    also save screenshots to ./test-shots (git-ignored)
 *
 * Checks, for the Romanian and the English page, on a phone and on a desktop:
 *   - the page loads, no console errors, no failed requests, fonts load
 *   - every in-page link scrolls to its section and the heading is not hidden under the sticky header
 *   - mobile menu, RO/EN switch (keeps the section), FAQ, package pick, request form, WhatsApp pill
 *   - no sideways scrolling from 320 px to 1440 px
 * Exit code 0 only if everything passes.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { start } = require('./static-server');

const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(__dirname, '..', 'test-shots');
if (SHOTS) fs.mkdirSync(SHOT_DIR, { recursive: true });

let pass = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; return; }
  failures.push(name + (detail !== undefined ? '  -> ' + detail : ''));
  console.log('  FAIL ' + name + (detail !== undefined ? '  -> ' + detail : ''));
}

async function settle(page) {
  let last = -1, same = 0;
  for (let i = 0; i < 80; i++) {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    if (y === last) { if (++same >= 3) return y; } else { same = 0; last = y; }
    await page.waitForTimeout(60);
  }
  return last;
}

function watch(page, label, sink) {
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') sink.push(label + ' console ' + m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => sink.push(label + ' pageerror: ' + e.message));
  page.on('requestfailed', (r) => sink.push(label + ' request failed: ' + r.url()));
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/nope')) sink.push(label + ' HTTP ' + r.status() + ': ' + r.url()); });
}

// Click every in-page link visible in this viewport and check where the page ends up.
async function testAnchors(page, label, tap) {
  const hrefs = await page.$$eval('a[href^="#"]', (as) => as.map((a) => a.getAttribute('href')));
  const tested = new Set();
  for (let i = 0; i < hrefs.length; i++) {
    const href = hrefs[i];
    const id = href.slice(1);
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); });
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = ''; });
    await page.waitForTimeout(60);
    const link = page.locator('a[href^="#"]').nth(i);
    if (!(await link.isVisible())) continue;
    // links further down the page: bring them on screen first
    await link.scrollIntoViewIfNeeded();
    await settle(page);
    const before = await page.evaluate(() => Math.round(window.scrollY));
    // The skip link sits above the screen until it has keyboard focus, as intended: use the keyboard.
    const isSkip = await link.evaluate((e) => e.classList.contains('s-skip'));
    try {
      if (isSkip) { await link.focus(); await page.keyboard.press('Enter'); }
      else if (tap) await link.tap({ timeout: 4000 });
      else await link.click({ timeout: 4000 });
    } catch (err) { check(label + ' link #' + i + ' ' + href + ' can be clicked', false, String(err.message).split('\n')[0]); continue; }
    const y = await settle(page);
    const info = await page.evaluate((tid) => {
      const el = document.getElementById(tid);
      const hd = document.querySelector('.s-hd');
      if (!el) return null;
      return { top: Math.round(el.getBoundingClientRect().top), hd: Math.round(hd.getBoundingClientRect().height), hash: location.hash, vh: innerHeight, max: document.documentElement.scrollHeight - innerHeight };
    }, id);
    check(label + ' link ' + href + ' has a target', !!info);
    if (!info) continue;
    check(label + ' link ' + href + ' updates the address', info.hash === href, info.hash);
    const underHeader = info.top < info.hd - 4;
    const offscreen = info.top > info.vh - 60;
    check(label + ' link ' + href + ' lands in view, not under the header', !underHeader && !offscreen, 'top=' + info.top + ' header=' + info.hd);
    tested.add(href);
    void before; void y;
  }
  return tested;
}

(async () => {
  const srv = await start(path.join(__dirname, '..', 'public'));
  const browser = await chromium.launch();
  const problems = [];
  const allHrefs = { ro: new Set(), en: new Set() };

  for (const lang of ['ro', 'en']) {
    const url = srv.url + (lang === 'ro' ? '/' : '/en/');
    console.log('--- ' + (lang === 'ro' ? 'Romanian' : 'English') + ' page');

    /* ---------------- desktop ---------------- */
    const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const d = await dctx.newPage();
    watch(d, lang + ' desktop', problems);
    const resp = await d.goto(url, { waitUntil: 'networkidle' });
    check(lang + ' page returns 200', resp.status() === 200, resp.status());
    await d.waitForTimeout(500);
    check(lang + ' <html lang>', (await d.getAttribute('html', 'lang')) === lang);
    const fontsOk = await d.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('700 40px "Bricolage Grotesque"') && document.fonts.check('400 16px "Figtree"');
    });
    check(lang + ' self-hosted fonts load', fontsOk);
    const stray = await d.evaluate(() => /\{\{|\}\}|\/_blob\//.test(document.body.innerHTML.replace(/<script[\s\S]*?<\/script>/g, '')));
    check(lang + ' no leftover template holes', !stray);
    if (SHOTS) await d.screenshot({ path: path.join(SHOT_DIR, lang + '-desktop-top.png') });

    const dTested = await testAnchors(d, lang + ' desktop', false);

    // header nav: each of the four links
    const navLinks = await d.$$eval('.s-nav a', (as) => as.map((a) => a.getAttribute('href')));
    check(lang + ' header nav has 4 links', navLinks.length === 4, navLinks.join());
    check(lang + ' every header nav link was clicked', navLinks.every((h) => dTested.has(h)));

    // FAQ
    await d.goto(url + '#intrebari', { waitUntil: 'load' });
    await settle(d);
    const firstQ = d.locator('details.s-q').first();
    await firstQ.locator('summary').click();
    await d.waitForTimeout(500);
    check(lang + ' FAQ opens', await firstQ.evaluate((e) => e.open));
    check(lang + ' FAQ answer is visible', await firstQ.locator('.s-q-a p').isVisible());

    // Package buttons select the package and go to the form
    await d.goto(url + '#oferte', { waitUntil: 'load' });
    await settle(d);
    const sig = d.locator('a[data-pkg="signature"]');
    await sig.scrollIntoViewIfNeeded();
    await sig.click();
    await settle(d);
    check(lang + ' "order Signature" selects the package', (await d.inputValue('#f-pkg')) === 'signature');
    check(lang + ' "order Signature" goes to the form', (await d.evaluate(() => location.hash)) === '#cere-un-site');

    // Request form
    await d.fill('input[name=companie]', 'Nord Auto SRL');
    await d.fill('input[name=domeniu]', 'Service auto');
    await d.fill('input[name=localitate]', 'București');
    await d.fill('input[name=persoana]', 'Ion Popescu');
    await d.fill('input[name=email]', 'ion@example.com');
    await d.fill('textarea[name=mesaj]', 'Vreau un site cu program și hartă.');
    check(lang + ' result box hidden before submit', !(await d.locator('#s-ok').isVisible()));
    await d.click('form.s-fm button[type=submit]');
    await d.waitForTimeout(400);
    check(lang + ' result box shows after submit', await d.locator('#s-ok').isVisible());
    const pre = await d.locator('.s-ok-pre').innerText();
    check(lang + ' message contains the company and the package', pre.includes('Nord Auto SRL') && /Signature/.test(pre), pre.slice(0, 80));
    const mailto = await d.getAttribute('#s-ok-mail', 'href');
    check(lang + ' mailto link is filled in', /^mailto:contact@shinedigital\.ro\?subject=.+&body=.+/.test(mailto), mailto && mailto.slice(0, 60));
    await d.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    const copyBefore = await d.locator('[data-copy]').innerText();
    await d.click('[data-copy]');
    await d.waitForTimeout(250);
    const copyAfter = await d.locator('[data-copy]').innerText();
    check(lang + ' copy button gives feedback', copyAfter !== copyBefore, copyBefore + ' / ' + copyAfter);
    if (SHOTS) await d.screenshot({ path: path.join(SHOT_DIR, lang + '-desktop-form-sent.png') });

    // WhatsApp pill
    await d.goto(url, { waitUntil: 'load' });
    await d.waitForTimeout(400);
    const waHref = await d.getAttribute('a.s-wa', 'href');
    check(lang + ' WhatsApp link points to the number', /^https:\/\/wa\.me\/40760509563\?text=.+/.test(waHref), waHref);
    check(lang + ' WhatsApp pill visible at the top', !(await d.locator('a.s-wa').evaluate((e) => e.classList.contains('s-wa-off'))));
    await d.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById('cere-un-site').scrollIntoView(); });
    await d.waitForTimeout(300);
    check(lang + ' WhatsApp pill steps aside at the form', await d.locator('a.s-wa').evaluate((e) => e.classList.contains('s-wa-off')));

    /* sideways scrolling at many widths */
    for (const w of [320, 360, 390, 430, 768, 1024, 1440]) {
      await d.setViewportSize({ width: w, height: 900 });
      await d.goto(url, { waitUntil: 'load' });
      await d.waitForTimeout(250);
      const ov = await d.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      check(lang + ' no sideways scroll at ' + w + ' px', ov <= 0, 'overflow ' + ov + 'px');
    }
    await dctx.close();

    /* ---------------- phone ---------------- */
    const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await pctx.newPage();
    watch(p, lang + ' phone', problems);
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(500);
    check(lang + ' phone: header nav hidden, burger shown', !(await p.locator('.s-nav').isVisible()) && (await p.locator('.s-burger').isVisible()));
    check(lang + ' phone: menu starts closed', !(await p.locator('#s-menu').isVisible()) && (await p.getAttribute('.s-burger', 'aria-expanded')) === 'false');

    // open the menu, tap each link
    const menuHrefs = await p.$$eval('#s-menu a[href^="#"]', (as) => as.map((a) => a.getAttribute('href')));
    check(lang + ' phone: menu has 5 section links', menuHrefs.length === 5, menuHrefs.join());
    for (let i = 0; i < menuHrefs.length; i++) {
      await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); document.documentElement.style.scrollBehavior = ''; });
      await p.tap('.s-burger');
      await p.waitForTimeout(200);
      check(lang + ' phone: burger opens the menu', await p.locator('#s-menu').isVisible() && (await p.getAttribute('.s-burger', 'aria-expanded')) === 'true');
      if (SHOTS && i === 0) await p.screenshot({ path: path.join(SHOT_DIR, lang + '-phone-menu.png') });
      const link = p.locator('#s-menu a[href^="#"]').nth(i);
      await link.tap();
      await settle(p);
      const info = await p.evaluate((href) => {
        const el = document.getElementById(href.slice(1));
        return { top: Math.round(el.getBoundingClientRect().top), hd: Math.round(document.querySelector('.s-hd').getBoundingClientRect().height), hash: location.hash, menu: !document.getElementById('s-menu').hidden };
      }, menuHrefs[i]);
      check(lang + ' phone: menu link ' + menuHrefs[i] + ' closes the menu', !info.menu);
      check(lang + ' phone: menu link ' + menuHrefs[i] + ' lands under the header, not hidden', info.hash === menuHrefs[i] && info.top >= info.hd - 4 && info.top < 400, JSON.stringify(info));
    }
    // Escape closes
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.tap('.s-burger');
    await p.keyboard.press('Escape');
    check(lang + ' phone: Escape closes the menu', !(await p.locator('#s-menu').isVisible()));

    // every other in-page link visible on the phone
    const pTested = await testAnchors(p, lang + ' phone', true);
    pTested.forEach((h) => allHrefs[lang].add(h));
    dTested.forEach((h) => allHrefs[lang].add(h));
    const pageHrefs = await p.$$eval('a[href^="#"]', (as) => Array.from(new Set(as.map((a) => a.getAttribute('href')))));
    check(lang + ' every distinct in-page link was exercised on some screen', pageHrefs.every((h) => allHrefs[lang].has(h)), pageHrefs.filter((h) => !allHrefs[lang].has(h)).join());

    // language switch keeps the section
    await p.goto(url + '#oferte', { waitUntil: 'load' });
    await settle(p);
    await p.tap('.s-burger');
    const other = lang === 'ro' ? 'en' : 'ro';
    const wantPath = other === 'ro' ? '/' : '/en/';
    await Promise.all([
      p.waitForURL((u) => u.pathname === wantPath && u.hash === '#oferte', { waitUntil: 'load' }),
      p.locator('#s-menu a[data-lang-link][lang="' + other + '"]').tap()
    ]);
    await settle(p);
    const sw = await p.evaluate(() => ({ lang: document.documentElement.lang, path: location.pathname, hash: location.hash, top: Math.round(document.getElementById('oferte').getBoundingClientRect().top) }));
    check(lang + ' phone: language switch goes to the other page and keeps #oferte', sw.lang === other && sw.path === (other === 'ro' ? '/' : '/en/') && sw.hash === '#oferte' && sw.top < 200, JSON.stringify(sw));
    const prices = await p.evaluate(() => Array.from(document.querySelectorAll('.s-pn')).map((e) => e.textContent).join('|') + ' ' + document.querySelector('.s-pu').textContent + ' ' + document.querySelector('.s-pc').textContent);
    check(other + ' prices follow the language', other === 'ro' ? /949\|1\.189\|1\.669 RON/.test(prices) : /199\|249\|350 USD/.test(prices) && /\$/.test(prices), prices);
    await pctx.close();
  }

  // 404 + extras
  const x = await browser.newContext();
  const xp = await x.newPage();
  const r404 = await xp.goto(srv.url + '/nope');
  check('unknown address returns 404', r404.status() === 404, r404.status());
  check('404 page shows the message', (await xp.content()).includes('Pagina nu a fost găsită'));
  for (const f of ['/robots.txt', '/sitemap.xml']) {
    const r = await xp.goto(srv.url + f);
    check(f + ' is served', r.status() === 200, r.status());
  }
  await x.close();

  check('no console errors / failed requests on any page', problems.length === 0, '\n    ' + problems.join('\n    '));

  await browser.close();
  await srv.close();
  console.log('\n' + pass + ' checks passed, ' + failures.length + ' failed');
  if (failures.length) { console.log('\nFailures:\n  ' + failures.join('\n  ')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
