# Shine Studio: first working version

The studio is an additive application in the existing ShineDigital repository. The marketing website stays in `project/Main.dc.html` and its generated `public/` pages. The studio uses static UI assets plus two Vercel Node functions and Supabase Auth/Postgres. This fits the current Vercel project without a framework migration.

## Entry points

- `/studio/`: invitation-only sign-in and dashboard.
- `/studio/?demo=1`: clearly labeled, browser-local demo with fictional businesses. Demo links do not share records with other browsers.
- `/preview/?token=<48-character-token>`: approved customer preview, including its three design choices.
- `/api/studio`: authenticated CRM and preview operations.
- `/api/preview`: restricted public preview projection and coarse interest events.

## Working features

Business CRUD (add/update; no destructive delete), search and status filters, follow-up dates, quote amounts, CSV export, private notes, consent recording, Romanian starter copy, editable copy, explicit preview snapshots, link disabling, three distinct layouts, WhatsApp message drafting, studio contact settings, and client stages.

Saving draft text does not change an already prepared preview. Use **Save & update preview** to replace that snapshot. `Live` is a manually tracked stage; it does not deploy a customer's website or attach a domain.

The preview generator uses deterministic starter copy from confirmed information. It does **not** call an AI service or scrape Google Maps. AI-assisted writing, photo uploads, automatic importing, billing, and automated customer-site launches are follow-on work. Do not describe these as active features.

## Cloud setup

1. The dedicated **Shine Digital Studio** Supabase project is `xvotksqksjiveyzjcacw`, in **LordLingo's Org**, Ireland (`eu-west-1`). The user approved the quoted **$10/month** charge and created it on November 5, 2026.
2. Inspect the new project's tables, then apply `supabase/migrations/202611040001_shine_studio.sql`.
3. Add the project's URL and active publishable key to **Vercel Preview** environment variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Do not use a service-role key in this application. Target the branch `codex/shine-studio` until approved for release.
4. Use Supabase Dashboard → Authentication → Users → Add user → Create new user to create the owner's account. The user enters and submits their own password; the studio currently supports password sign-in, not invitation or password-reset links. Confirm the account email and insert its exact Auth user ID into `studio_members` with role `owner`; add the friend's user later with role `editor`. Do not guess a user ID or grant membership to every authenticated account.
5. Sign in, save studio contact settings, and test one real business. The existing public site's contact number is `+40760509563` and email is `contact@shinedigital.ro`; verify they should be used for this sales workflow before setting them.
6. Test unauthenticated access, permission checks, draft/preview separation, link disabling, and the public projection against the live database. Run Supabase security advisors.
7. The existing Vercel project protects its `.vercel.app` URLs with Vercel sign-in. Keep that protection during review. Before sending previews to prospects, explicitly configure the intended public audience/domain while retaining the studio's own Auth and RLS restrictions.
8. Merge and release only after the owner reviews the branch preview. Add Production environment variables at that point.

## Security boundaries

- Supabase sessions are kept in Secure, HttpOnly, SameSite=Lax cookies; browser JavaScript never sees the tokens.
- Mutations require a same-origin JSON request. Auth validates access tokens and checks explicit studio membership.
- RLS restricts leads and settings to members. Only owners can change settings. Membership changes are administered outside the app.
- Supabase advisors flag the two public security-definer RPCs as intentionally callable by anonymous and authenticated users. They expose only token-addressed approved previews and validated activity, never general table access. Membership helpers are in the unexposed `private` schema.
- Public preview RPC returns only the prepared snapshot, quote, and seller contact details. It never exposes private notes, consent history, or the CRM row.
- Preview tokens use 24 random bytes. A link is a bearer capability; it can be forwarded. Turning it off prevents further API reads, but cannot retract saved copies.
- Preview activity can be anonymous or automated; it is not proof of an identified owner visiting. Activity never changes a sale stage automatically.
- No WhatsApp message is sent by the app. A user must send the prepared message in WhatsApp, then update the sale stage manually.
- Noindex tags and headers are added to the studio and previews; these are not access controls.

## Development and verification

```sh
npm run build
npm run test:studio
node tests/studio-browser.test.cjs
bash tools/verify.sh
npm run dev:studio
```

The browser scripts need Playwright's matching Chromium installed. No runtime npm dependencies are needed. The managed build environment had Playwright but no browser binary: unit/security checks and marketing build checks passed; interactive QA was performed in the available cloud browser instead. The live database has been provisioned and its anonymous access, nonmember access, approved preview projection, event recording, and preview disabling were checked in a rolled-back transaction. Full owner sign-in verification requires the owner account.

`studio-source/` is the editable UI source. `tools/build-studio.js` copies it to `public/studio/` and `public/preview/`. Commit both. The server functions live in `server/studio.cjs`, and `api/` contains their entrypoints. `STUDIO_LOCAL=1` may be used only in a local test process to omit Secure cookies; never configure it on Vercel.
