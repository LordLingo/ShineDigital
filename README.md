# Shine Digital: site redesign

Mobile-first, bilingual (Romanian / English) one-page site for **Shine Digital**, a web studio that sells to small service businesses in Bucharest. The owners mostly use phones, so the phone experience comes first.

## Status

**Deployable.** Vercel publishes the `public/` folder and nothing else (`vercel.json` → `outputDirectory`). This README, `project/`, `tests/` and `tools/` are never served.

| URL | Page |
| --- | --- |
| `/` | Romanian (default) |
| `/en/` | English |
| `/404.html` | Not-found page |

Both pages are real pre-rendered HTML, so the content shows without JavaScript. They carry hreflang and canonical tags, link-preview cards (Open Graph and Twitter), favicons, `robots.txt` and `sitemap.xml`. Fonts are self-hosted.

`public/` is **generated** from the design source. Do not edit `public/index.html` by hand: the next build overwrites it.

Design canvas version: **8**. Private preview (owner only): https://claude.ai/artifact/Py9VSNe1B9yfjEjdXPrshn

## Change something

1. Edit `project/Main.dc.html` (the design source).
2. Run `bash tools/verify.sh`. It checks the canvas, rebuilds `public/`, then tests the built site in a real browser.
3. Commit **including `public/`** and push to `main`. Vercel deploys on every push.

| Command | What it does |
| --- | --- |
| `bash tools/verify.sh` | Every check below, then a rebuild. Stops at the first failure |
| `node tools/build-static.js` | Rebuilds `public/` only (both pages, 404, hashed CSS and JS, `robots.txt`, `sitemap.xml`). Fails if a `{{ }}` hole, an `onClick`, a duplicate id or an in-page `#link` with no target is left |
| `node tests/static-browser.test.js` | Opens the built site in Chromium on a phone (390x844) and a desktop (1440x900), in both languages. Checks every navigation link lands on its section under the sticky header, the mobile menu, the language switch, the form, the WhatsApp button and sideways scroll. `--shots` saves screenshots to `test-shots/` (git-ignored) |
| `node tools/make-og.js` | Redraws the link-preview images. Run it when the hero text changes, then rebuild |
| `python3 tools/make-icons.py` | Redraws the favicon and home-screen icon from `assets/shine-logo.png` |

Needs Node and Python 3. The browser test and the preview images need Playwright with Chromium. The icon script needs Pillow, numpy and scipy.

### How the build works

A Node script (`tools/build-static.js`) runs the canvas component with a stub runtime, reads both dictionaries and the computed values, and renders the template to HTML once per language. A small hand-written script (`tools/static/site.js`) adds the mobile menu, hover effects, package pick, form and WhatsApp button hiding. Nothing from Claude is needed at runtime.

The language switch is a plain link between the two pages and keeps the `#section` you were on.

## What the page has

- Hero, marquee, 3-step process, example sites (Nord Auto concept), benefits, pricing, FAQ, request form, final call to action, footer
- **RO / EN switch** in the header, the mobile menu and the footer. The page opens in Romanian
- **Prices follow the language**: RON in Romanian, USD in English
- **WhatsApp**: floating button plus buttons in the contact area and the final call to action. The button hides near the form so it never covers it
- The request form builds an email (opens the mail app or shows a copy box). There is no backend and no online payment
- Logo, motion graphics, hover effects, reduced-motion support

## Where to change things

| What | Where |
| --- | --- |
| Prices | `project/Main.dc.html` → `dict()` → `RON` and `USD` |
| WhatsApp number | `renderVals()` → `WA_NUMBER` |
| Romanian and English text | `dict()` → the `ro` and `en` objects (same keys in both) |
| Colors and fonts | `.s-root` at the top of the CSS |
| Contact email | `contact@shinedigital.ro` in the canvas template and `submit()`, and `EMAIL` in `tools/build-static.js` |
| Site address, share images | `SITE` and `META` in `tools/build-static.js` |
| Security and cache headers | `vercel.json` |

Current prices:

| Package | RON | USD | Notes |
| --- | --- | --- | --- |
| Essential | 949 | 199 | |
| Signature | 1.189 | 249 | Adds a logo |
| Visibility | 1.669 | 350 | Adds service pages, SEO setup, **motion graphics** |

RON is the USD price at about 4.75 (4 Nov 2026), rounded to a 9-ending.

## Open items

1. **Domain.** `shinedigital.ro` is not attached to the Vercel project yet (Project → Settings → Domains). Until it is, the site lives only on the `.vercel.app` address, and Vercel's Deployment Protection can put a login in front of that address
2. **Founder photo + video block** is built but parked until she agrees. See `addons/her-block/`. The video script is in `docs/video-script.md`
3. The examples section says the sites are concepts for fictional businesses. Replace with 2 to 3 real previews and real reviews
4. Footer has no company details (legal name, CUI, address). Add them if a registered company exists
5. The form only prepares an email. A real inbox that receives requests directly needs a small backend or a form service

## Folders

- `public/` the built site. **This is what goes live**
- `project/` design source (`Main.dc.html`) and `canvas.json`
- `tools/` build and asset scripts: `build-static.js`, `make-og.js`, `make-icons.py`, `verify.sh`, `lib/` (canvas loader), `static/` (site script and extra CSS), `key_logo.py` (keys the logo's dark background to transparent)
- `tests/` canvas checks (`check.py`, `test_i18n.js`, `wa-test.js`) and the browser test for the built site (`static-browser.test.js`, `static-server.js`)
- `assets/` logo (transparent PNG and WebP) and the original upload
- `addons/her-block/` the parked founder block, with its own tests
- `docs/` video script

Fonts: Bricolage Grotesque and Figtree, SIL Open Font License. Self-hosted in `public/assets/fonts/` with their licenses next to them.
