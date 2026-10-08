# Resilient Skills training site

Marketing + registration site for a Middle Tennessee field-training organization, built
from the approved prototype in `docs/prototype/` per `docs/SPEC.md`.

**Stack:** Astro (static pages + one Preact island) on Cloudflare Pages · Pages Functions ·
D1 · Stripe Checkout · Resend · Google Sheet email list (via Apps Script).

## Where things live

| What | Where |
|---|---|
| **All org settings** (name, phone, email, price, cutoff, blackout dates, waiver version) | `shared/config.ts` |
| Waiver and policies text (attorney edits go here) | `content/waiver.md`, `content/policies.md` |
| Pages | `src/pages/` (`/`, `/ncrt/`, `/register/`, `/register/confirmed/`, `/policies/`) |
| Registration flow (3 steps) | `src/islands/RegisterFlow.tsx` |
| Validation + date rules (shared by browser and server) | `shared/registration.ts`, `shared/dates.ts` |
| Design tokens + styles | `src/styles/global.css` (see `DESIGN.md`, `PRODUCT.md`) |
| Server endpoints | `functions/api/*`, roster at `functions/admin/*` |
| Database schema | `migrations/0001_init.sql` |
| Email list adapter | `functions/_lib/list.ts` (setup: `docs/google-sheet-list.md`) |

The training address is never stored or shown anywhere. Copy tells people it's emailed.

## Commands

```bash
npm install
npm run dev          # Astro dev server (pages only; /api calls need preview)
npm test             # unit tests: dates, cutoff, guardian + signature rules, legal parsing
npm run build        # regenerates legal text, type-checks, builds to dist/
npm run preview      # build + run pages and functions locally with Wrangler (needs .dev.vars)
```

For `preview`, copy `.dev.vars.example` to `.dev.vars` and run `npm run db:migrate:local` once.

## Before launch (owner)

1. **Fill in `shared/config.ts`:** `orgName`, `url`, `phoneDisplay`, `phoneTel`, `email`,
   `ownerEmail`, `fromEmail`, `priceCents`. Also set `site` in `astro.config.mjs` to the same URL.
   While `priceCents` is 0 the site shows `[Price]` and online checkout is disabled.
2. **Attorney review** of `content/waiver.md` and `content/policies.md`. If the waiver text
   changes after launch, bump `legal.waiverVersion` in config (the server refuses to store a
   changed waiver under an old version label).
3. Confirm with NCRT that its copy and photos can be used. Supply a home class photo: put it in
   `src/assets/images/` and set `homeClassPhoto` in config.
4. Liability insurance in place.

## Deploy to Cloudflare Pages

1. `npx wrangler d1 create training-db` and paste the `database_id` into `wrangler.toml`.
2. `npm run db:migrate:remote`
3. Create the Pages project from this repo. Build command `npm run build`, output `dist`.
   Bind D1 as `DB` (Settings → Functions → D1 bindings) if not picked up from `wrangler.toml`.
4. Environment variables (as secrets): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `RESEND_API_KEY`, `LIST_WEBHOOK_URL`, `LIST_WEBHOOK_SECRET`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`.
5. **Stripe:** add a webhook endpoint `https://YOUR-DOMAIN/api/stripe-webhook` for
   `checkout.session.completed`, `checkout.session.async_payment_succeeded` and
   `checkout.session.expired`. Use test-mode keys first.
6. **Resend:** verify the sending domain used in `fromEmail`.
7. **Roster:** protect `/admin*` with Cloudflare Zero Trust → Access (allow only the owner's
   email). Put the team domain and the application's AUD tag in `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD`.
   The roster refuses all requests until both are set and the Access token verifies.

## How a registration flows

1. Browser validates each step (same rules the server uses). Draft is kept in `sessionStorage`
   so a cancelled Stripe checkout returns to step 3 with everything intact.
2. `POST /api/registrations` re-validates everything (date must be an upcoming open Wednesday,
   signatures must match student/guardian names, both agreements checked), stores the
   registration as `pending_payment` with the waiver version, SHA-256 of the exact waiver text,
   signing time, IP and user agent, then creates a Stripe Checkout Session priced from config.
3. Stripe webhook marks it `paid` (idempotently), emails the registrant and owner, and adds the
   registrant to the list if they opted in.
4. Stripe returns the person to `/register/confirmed/?r=ID`.

## What was verified locally

- Unit tests (8) pass, including the 10:00 AM CT same-day cutoff, DST, and late-night timezone edge.
- Full browser run: validation summary, guardian field only for minors, signature mismatch
  rejected, required agreements, server-side total (2 × price), stored waiver hash/IP/UA.
- Signed webhook: bad signature rejected, paid transition, replay does not re-send email.
- Forms: honeypot dropped, invalid email rejected, cross-origin post blocked, no-JS fallback.
- No horizontal scroll at 320px on any page; type-check clean.

Not yet exercised against live services: real Stripe test checkout, Resend delivery, the Google
Sheet webhook, and Cloudflare Access. Do one end-to-end test-mode registration after deploy.
