# Shine Digital: site redesign

Mobile-first, bilingual (Romanian / English) one-page site for **Shine Digital**, a web studio that sells to small service businesses in Bucharest. The owners mostly use phones, so the phone experience comes first.

## Status

**Design source. Not deployable as it is.**

`project/Main.dc.html` is a Claude *design canvas* page. It renders inside Claude, which supplies the runtime script (`support.js`). That file is not in this repo, so opening the page in a plain browser shows nothing useful. A static build (`index.html` + CSS + JS) is the next step before it can go live on shinedigital.ro.

Current version: **8**. Private preview (owner only): https://claude.ai/artifact/Py9VSNe1B9yfjEjdXPrshn

## What the page has

- Hero, marquee, 3-step process, example sites (Nord Auto concept), benefits, pricing, FAQ, request form, final call to action, footer
- **RO / EN switch** in the header, the mobile menu and the footer. The page opens in Romanian
- **Prices follow the language**: RON in Romanian, USD in English
- **WhatsApp**: floating button plus buttons in the contact area and the final call to action. The pill hides near the form so it never covers it
- Request form builds an email (opens the mail app or shows a copy box). There is no backend and no online payment
- Logo, motion graphics, hover effects, reduced-motion support

## Where to change things

| What | Where in `project/Main.dc.html` |
| --- | --- |
| Prices | `dict()` → `RON` and `USD` |
| WhatsApp number | `renderVals()` → `WA_NUMBER` |
| Romanian and English text | `dict()` → the `ro` and `en` objects (same keys in both) |
| Colors and fonts | `.s-root` at the top of the CSS |
| Contact email | `contact@shinedigital.ro` (template and `submit()`) |

Current prices:

| Package | RON | USD | Notes |
| --- | --- | --- | --- |
| Essential | 949 | 199 | |
| Signature | 1.189 | 249 | Adds a logo |
| Visibility | 1.669 | 350 | Adds service pages, SEO setup, **motion graphics** |

RON is the USD price at about 4.75 (4 Nov 2026), rounded to a 9-ending.

## Check before publishing

```bash
python3 tests/check.py project/Main.dc.html /tmp/jscheck.js && node /tmp/jscheck.js
node tests/test_i18n.js project/Main.dc.html
node tests/wa-test.js project/Main.dc.html
```

All three should finish without errors. In the language test, look for `missing=[]` in both languages.

To republish to the Claude artifact: Artifact tool with `root` = the repo root and `file_path` = `project/Main.dc.html`.

## Open items

1. **Founder photo + video block** is built but parked until she agrees. See `addons/her-block/`. The video script is in `docs/video-script.md`
2. The examples section says the sites are concepts for fictional businesses. Replace with 2 to 3 real previews and real reviews
3. Footer has no company details (legal name, CUI, address). Add them if a registered company exists
4. Static build for deployment

## Folders

- `project/` page source and `canvas.json`
- `assets/` logo (transparent PNG and WebP) and the original upload
- `tests/` static check, language test, WhatsApp test
- `addons/her-block/` the parked founder block, with its own tests
- `docs/` video script
- `tools/` script used to key the logo's dark background to transparent
