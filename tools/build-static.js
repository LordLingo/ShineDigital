#!/usr/bin/env node
/*
 * Shine Digital: static site builder.
 *
 *   node tools/build-static.js
 *
 * Turns the design canvas (project/Main.dc.html) into plain files that any
 * host can serve, and writes them to public/ :
 *
 *   public/index.html        Romanian page   (https://shinedigital.ro/)
 *   public/en/index.html     English page    (https://shinedigital.ro/en/)
 *   public/404.html          not-found page
 *   public/assets/css|js     one stylesheet and one script, hash in the name
 *   public/sitemap.xml, robots.txt
 *
 * The canvas stays the single source for text, prices, WhatsApp number and
 * styles. Change them there, run this script, commit public/.
 * Files in public/ that are NOT written here (fonts, logo, icons, share
 * images) are committed by hand: see README.md.
 *
 * No dependencies. Node 16+.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'project', 'Main.dc.html');
const PUB = path.join(ROOT, 'public');
const STATIC = path.join(__dirname, 'static');

const SITE = 'https://shinedigital.ro';
const EMAIL = 'contact@shinedigital.ro';
const THEME = '#0c0913';
const LOGO = '/assets/img/shine-logo.webp';
const BLOB_LOGO = '/_blob/1d9037ba577aafad0da6609b393ccde2';

function fail(msg) {
  console.error('BUILD FAILED: ' + msg);
  process.exit(1);
}
function must(cond, msg) { if (!cond) fail(msg); }
function exists(rel) { return fs.existsSync(path.join(PUB, rel)); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(rel, content) {
  const p = path.join(PUB, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}
function hash(s) { return crypto.createHash('sha256').update(s).digest('hex').slice(0, 10); }

/* ------------------------------------------------------------------ source */

let canvas;
try { canvas = require('./lib/canvas')(SRC); } catch (err) { fail(err.message); }
const src = canvas.src;
must(src.includes(EMAIL), 'Contact email ' + EMAIL + ' not found in the canvas');
must(src.includes(BLOB_LOGO), 'Logo placeholder ' + BLOB_LOGO + ' not found in the canvas');

const valsFor = canvas.valsFor;
const LANGS = ['ro', 'en'];
const roKeys = Object.keys(valsFor('ro').dict.ro).sort().join();
const enKeys = Object.keys(valsFor('en').dict.en).sort().join();
must(roKeys === enKeys, 'Romanian and English dictionaries have different keys');

/* ---------------------------------------------------------- template parse */

const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'wbr']);

function parseAttrs(s) {
  const attrs = [];
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(s))) {
    const v = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4];
    attrs.push([m[1], v === undefined ? null : v]);
  }
  return attrs;
}

function parse(html) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\/[a-zA-Z][^>]*>|<[a-zA-Z][^>]*>|[^<]+|</g;
  let m;
  while ((m = re.exec(html))) {
    const tok = m[0];
    const top = stack[stack.length - 1];
    if (tok.startsWith('<!--')) continue;
    if (tok.startsWith('</')) {
      const name = tok.slice(2, -1).trim().toLowerCase();
      const el = stack.pop();
      if (!el || el.name !== name) throw new Error('Mismatched </' + name + '> (open: ' + (el && el.name) + ')');
      continue;
    }
    if (tok[0] === '<' && tok.length > 1) {
      const mm = /^<([a-zA-Z][^\s\/>]*)([\s\S]*?)(\/?)>$/.exec(tok);
      const el = { type: 'el', name: mm[1].toLowerCase(), attrs: parseAttrs(mm[2]), children: [] };
      top.children.push(el);
      if (!VOID.has(el.name) && !mm[3]) stack.push(el);
      continue;
    }
    top.children.push({ type: 'text', value: tok });
  }
  if (stack.length !== 1) throw new Error('Unclosed <' + stack[stack.length - 1].name + '>');
  return root;
}

const tree = parse(canvas.template);

/* --------------------------------------------------------------- rendering */

const HOLE = /\{\{\s*([^{}]+?)\s*\}\}/g;
const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function resolve(expr, ctx) {
  let v = ctx;
  for (const p of expr.split('.')) {
    if (v === undefined || v === null) break;
    v = v[p];
  }
  if (v === undefined || v === null || typeof v === 'function') throw new Error('Unresolved hole {{' + expr + '}}');
  return String(v);
}
const fillText = (s, ctx) => s.replace(HOLE, (_, e) => escText(resolve(e, ctx)));
const fillAttr = (s, ctx) => s.replace(HOLE, (_, e) => escAttr(resolve(e, ctx)));

// Canvas event handlers become data- attributes that tools/static/site.js reads.
const EVENT_MAP = {
  'onPointerMove:spot': ' data-spot',
  'onPointerMove:tilt': ' data-tilt',
  'onPointerLeave:untilt': '',
  'onClick:toggleMenu': ' data-menu-toggle',
  'onClick:closeMenu': '',
  'onClick:pick': '',
  'onClick:copyMsg': ' data-copy',
  // no-JavaScript fallback; the script calls preventDefault()
  'onSubmit:submit': ' action="mailto:' + EMAIL + '" method="post" enctype="text/plain"'
};

function renderChildren(children, ctx, hideFirstEl) {
  let out = '';
  let hid = false;
  for (const c of children) {
    if (c.type === 'el' && hideFirstEl && !hid) { out += renderEl(c, ctx, true); hid = true; } else out += renderNode(c, ctx);
  }
  return out;
}

function renderNode(n, ctx) {
  return n.type === 'text' ? fillText(n.value, ctx) : renderEl(n, ctx, false);
}

function renderEl(el, ctx, hide) {
  if (el.name === 'sc-if') {
    const cond = (el.attrs.find((a) => a[0] === 'value') || [0, ''])[1].replace(/\{\{|\}\}/g, '').trim();
    // Both conditions start false on the canvas. Here the markup is present and `hidden`;
    // the script un-hides it.
    if (cond !== 'menuOpen' && cond !== 'sent') throw new Error('Unknown sc-if condition: ' + cond);
    return renderChildren(el.children, ctx, true);
  }

  const get = (n) => (el.attrs.find((a) => a[0] === n) || [])[1];

  // RO / EN buttons become real links (one page per language).
  const click = get('onClick');
  const setLang = click && /^\{\{\s*set(Ro|En)\s*\}\}$/.exec(click);
  if (el.name === 'button' && setLang) {
    const code = setLang[1].toLowerCase();
    const current = ctx.lang === code;
    return '<a href="' + (code === 'ro' ? '/' : '/en/') + '" lang="' + code + '" hreflang="' + code +
      '" data-lang-link' + (current ? ' aria-current="true"' : '') + '>' +
      renderChildren(el.children, ctx) + '</a>';
  }

  let attrs = '';
  let extra = '';
  for (const [n, v] of el.attrs) {
    if (n === 'hint-placeholder-val') continue;
    if (/^on[A-Z]/.test(n)) {
      const fn = String(v).replace(/\{\{|\}\}/g, '').trim();
      const key = n + ':' + fn;
      if (!(key in EVENT_MAP)) throw new Error('Unhandled event binding ' + key + ' on <' + el.name + '>');
      extra += EVENT_MAP[key];
      continue;
    }
    attrs += ' ' + (v === null ? n : n + '="' + fillAttr(v, ctx) + '"');
  }
  // The result box links to the filled-in mail; the script needs to find it.
  if (el.name === 'a' && get('href') === '{{mailto}}') extra += ' id="s-ok-mail"';
  if (hide) extra += ' hidden';

  const open = '<' + el.name + attrs + extra + '>';
  if (VOID.has(el.name)) return open;
  return open + renderChildren(el.children, ctx) + '</' + el.name + '>';
}

function ctxFor(lang) {
  const { vals } = valsFor(lang);
  return Object.assign({}, vals, {
    menuExpanded: 'false',
    waClass: '',
    msg: '',
    mailto: 'mailto:' + EMAIL,
    copyLabel: vals.t.copy_default
  });
}

/* ------------------------------------------------------------------- CSS/JS */

function replaceExact(str, from, to, count) {
  const parts = str.split(from);
  must(parts.length - 1 === count, 'CSS: expected ' + count + ' x "' + from + '", found ' + (parts.length - 1));
  return parts.join(to);
}

function fontFaces() {
  const latin = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
  const ext = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
  const files = [
    'bricolage-grotesque-latin-standard-normal.woff2', 'bricolage-grotesque-latin-ext-standard-normal.woff2',
    'figtree-latin-wght-normal.woff2', 'figtree-latin-ext-wght-normal.woff2'
  ];
  files.forEach((f) => must(exists('assets/fonts/' + f), 'Missing font file public/assets/fonts/' + f));
  const face = (family, weight, stretch, file, range) =>
    '@font-face{font-family:\'' + family + '\';font-style:normal;font-weight:' + weight + ';' +
    (stretch ? 'font-stretch:' + stretch + ';' : '') + 'font-display:swap;src:url(/assets/fonts/' + file +
    ') format(\'woff2\');unicode-range:' + range + '}\n';
  return '/* Fonts are self-hosted (SIL Open Font License, see assets/fonts/OFL-*.txt) */\n' +
    face('Bricolage Grotesque', '200 800', '75% 100%', files[1], ext) +
    face('Bricolage Grotesque', '200 800', '75% 100%', files[0], latin) +
    face('Figtree', '300 900', '', files[3], ext) +
    face('Figtree', '300 900', '', files[2], latin);
}

let css = canvas.css.trim() + '\n';
css = replaceExact(css, '.s-lang button', '.s-lang a', 3);
css = replaceExact(css, '.s-menu-lang button', '.s-menu-lang a', 2);
css = replaceExact(css, '[aria-pressed="true"]', '[aria-current="true"]', 2);
css = fontFaces() + css + '\n' + read(path.join(STATIC, 'site-extra.css'));
const cssName = 'site.' + hash(css) + '.css';

const js = read(path.join(STATIC, 'site.js'));
const jsName = 'site.' + hash(js) + '.js';

/* -------------------------------------------------------------------- pages */

const PAGE_KEYS = ['m_to', 'm_subject', 'm_subject_pre', 'm_pkg', 'm_company', 'm_field', 'm_city', 'm_contact',
  'm_email', 'm_phone', 'm_budget', 'm_want', 'pkg_none', 'pkg_essential', 'pkg_signature', 'pkg_visibility',
  'bud_none', 'bud_1', 'bud_2', 'bud_3', 'bud_4', 'copy_ok', 'copy_sel', 'copy_default'];

const META = {
  ro: { path: '/', locale: 'ro_RO', alt: 'en_US', og: 'og-ro.jpg' },
  en: { path: '/en/', locale: 'en_US', alt: 'ro_RO', og: 'og-en.jpg' }
};

function head(lang, t, extraHead) {
  const m = META[lang];
  const title = 'Shine Digital · ' + t.site_uri_pentru_afaceri;
  const desc = t.afacerea_ta_merita_sa;
  const url = SITE + m.path;
  const og = exists('assets/img/' + m.og) ? SITE + '/assets/img/' + m.og : '';
  const preload = ['bricolage-grotesque-latin-standard-normal.woff2', 'figtree-latin-wght-normal.woff2']
    .concat(lang === 'ro' ? ['bricolage-grotesque-latin-ext-standard-normal.woff2', 'figtree-latin-ext-wght-normal.woff2'] : []);
  const lines = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + escText(title) + '</title>',
    '<meta name="description" content="' + escAttr(desc) + '">',
    '<meta name="theme-color" content="' + THEME + '">',
    '<meta name="color-scheme" content="dark">',
    '<link rel="canonical" href="' + url + '">',
    '<link rel="alternate" hreflang="ro" href="' + SITE + '/">',
    '<link rel="alternate" hreflang="en" href="' + SITE + '/en/">',
    '<link rel="alternate" hreflang="x-default" href="' + SITE + '/">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Shine Digital">',
    '<meta property="og:title" content="' + escAttr(title) + '">',
    '<meta property="og:description" content="' + escAttr(desc) + '">',
    '<meta property="og:url" content="' + url + '">',
    '<meta property="og:locale" content="' + m.locale + '">',
    '<meta property="og:locale:alternate" content="' + m.alt + '">'
  ];
  if (og) {
    lines.push('<meta property="og:image" content="' + og + '">',
      '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
      '<meta property="og:image:alt" content="' + escAttr(title) + '">',
      '<meta name="twitter:card" content="summary_large_image">',
      '<meta name="twitter:image" content="' + og + '">');
  } else {
    lines.push('<meta name="twitter:card" content="summary">');
  }
  lines.push('<meta name="twitter:title" content="' + escAttr(title) + '">',
    '<meta name="twitter:description" content="' + escAttr(desc) + '">');
  if (exists('favicon.svg')) lines.push('<link rel="icon" href="/favicon.svg" type="image/svg+xml">');
  if (exists('favicon-32.png')) lines.push('<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">');
  if (exists('apple-touch-icon.png')) lines.push('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
  preload.forEach((f) => lines.push('<link rel="preload" href="/assets/fonts/' + f + '" as="font" type="font/woff2" crossorigin>'));
  lines.push('<link rel="stylesheet" href="/assets/css/' + cssName + '">');
  if (extraHead) lines.push(extraHead);
  return lines.join('\n');
}

function buildPage(lang) {
  const ctx = ctxFor(lang);
  const t = ctx.t;
  let body = renderChildren(tree.children, ctx);
  const logos = body.split(BLOB_LOGO).length - 1;
  must(logos === 3, 'Expected 3 logo images, found ' + logos);
  body = body.split(BLOB_LOGO).join(LOGO);
  const pageData = { lang, email: EMAIL, t: {} };
  PAGE_KEYS.forEach((k) => { must(k in t, 'Dictionary key missing: ' + k); pageData.t[k] = t[k]; });
  const json = JSON.stringify(pageData).replace(/</g, '\\u003c');
  return '<!doctype html>\n<html lang="' + lang + '">\n<head>\n' + head(lang, t) + '\n</head>\n<body>\n' + body +
    '\n<script type="application/json" id="sd-data">' + json + '</script>\n' +
    '<script src="/assets/js/' + jsName + '" defer></script>\n</body>\n</html>\n';
}

function build404() {
  const ro = valsFor('ro').vals.t;
  const t = { site_uri_pentru_afaceri: ro.site_uri_pentru_afaceri, afacerea_ta_merita_sa: ro.afacerea_ta_merita_sa };
  const lines = head('ro', t).split('\n')
    .filter((l) => !/rel="canonical"|hreflang=|og:url|og:image|twitter:image/.test(l));
  lines.push('<meta name="robots" content="noindex">');
  return '<!doctype html>\n<html lang="ro">\n<head>\n' + lines.join('\n') + '\n</head>\n<body>\n' +
    '<div class="s-root" lang="ro">\n<main class="s-wrap s-nf">\n' +
    '<a class="s-logo" href="/" aria-label="Shine Digital" translate="no"><img class="s-lg" src="' + LOGO +
    '" width="514" height="256" alt="Shine Digital"></a>\n' +
    '<h1 class="s-h2">Pagina nu a fost găsită.<br>Page not found.</h1>\n' +
    '<div class="s-cta"><a class="s-btn s-btn-p" href="/">Înapoi la pagina principală</a>' +
    '<a class="s-btn s-btn-g" href="/en/" lang="en">Back to the homepage</a></div>\n' +
    '</main>\n</div>\n</body>\n</html>\n';
}

/* ---------------------------------------------------------------- checks */

function checkPage(name, fullHtml) {
  const problems = [];
  // The JSON data block legitimately ends in "}}", so leave it out of the hole check.
  const html = fullHtml.replace(/<script type="application\/json"[^>]*>[\s\S]*?<\/script>/, '');
  if (/\{\{|\}\}/.test(html)) problems.push('leftover {{ }} hole');
  if (/<sc-if|<x-dc|<helmet|onClick=|onPointer|onSubmit=/.test(html)) problems.push('leftover canvas markup');
  if (html.includes('/_blob/')) problems.push('leftover /_blob/ url');
  const ids = new Set();
  html.replace(/\sid="([^"]+)"/g, (_, id) => { if (ids.has(id)) problems.push('duplicate id ' + id); ids.add(id); return ''; });
  const links = [];
  html.replace(/\shref="#([^"]*)"/g, (_, id) => { links.push(id); return ''; });
  links.forEach((id) => { if (!ids.has(id)) problems.push('link to #' + id + ' has no target'); });
  html.replace(/\s(?:aria-controls|aria-labelledby|for)="([^"]+)"/g, (_, id) => {
    id.split(/\s+/).forEach((i) => { if (!ids.has(i)) problems.push('reference to id ' + i + ' has no target'); });
    return '';
  });
  must(problems.length === 0, name + ': ' + problems.join('; '));
  return { links: links.length, uniqueTargets: new Set(links).size, ids: ids.size };
}

/* ------------------------------------------------------------------ write */

['assets/css', 'assets/js'].forEach((dir) => {
  const abs = path.join(PUB, dir);
  fs.mkdirSync(abs, { recursive: true });
  fs.readdirSync(abs).forEach((f) => { if (/^site\.[0-9a-f]{10}\.(css|js)$/.test(f)) fs.unlinkSync(path.join(abs, f)); });
});
write('assets/css/' + cssName, css);
write('assets/js/' + jsName, js);

const report = [];
for (const lang of LANGS) {
  const html = buildPage(lang);
  const rel = lang === 'ro' ? 'index.html' : 'en/index.html';
  const stats = checkPage(rel, html);
  write(rel, html);
  report.push(rel + ': ' + html.length + ' bytes, ' + stats.links + ' in-page links to ' + stats.uniqueTargets + ' targets, ' + stats.ids + ' ids');
}
const nf = build404();
write('404.html', nf);

write('robots.txt', 'User-agent: *\nAllow: /\n\nSitemap: ' + SITE + '/sitemap.xml\n');
const alt = '<xhtml:link rel="alternate" hreflang="ro" href="' + SITE + '/"/>\n' +
  '    <xhtml:link rel="alternate" hreflang="en" href="' + SITE + '/en/"/>\n' +
  '    <xhtml:link rel="alternate" hreflang="x-default" href="' + SITE + '/"/>';
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
  '  <url>\n    <loc>' + SITE + '/</loc>\n    ' + alt + '\n  </url>\n' +
  '  <url>\n    <loc>' + SITE + '/en/</loc>\n    ' + alt + '\n  </url>\n</urlset>\n');

console.log('Built public/ from project/Main.dc.html');
report.forEach((l) => console.log('  ' + l));
console.log('  assets/css/' + cssName + ' (' + css.length + ' bytes), assets/js/' + jsName + ' (' + js.length + ' bytes)');
