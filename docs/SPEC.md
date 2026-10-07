# Build spec — [Organization name] training site

A small marketing + registration site for a not-yet-named Middle Tennessee organization that teaches wilderness survival, medical, ropes, bushcraft, living-off-the-land and homesteading courses. One page belongs to its partner, No Compromise Response Team (NCRT).

The approved design is the prototype in `prototype/`. Match it. This document says what the prototype can't: data, integrations, rules and acceptance criteria.

---

## 1. Decisions to confirm before building

Each has a default. Ask the owner to confirm or override the open ones first; do not silently pick.

| # | Decision | Default (recommended) | Status |
|---|---|---|---|
| D1 | Organization name and domain | — | **Open.** Use `[Organization name]` until set; keep it in one config value. |
| D2 | Phone number and contact email | — | **Open.** One config value each. |
| D3 | Price per student | — | **Open.** One config value (cents). Total = price × students. |
| D4 | Framework / hosting | Astro (static pages + islands) on Cloudflare Pages | Recommended |
| D5 | Server logic | Cloudflare Pages Functions | Recommended |
| D6 | Registration + waiver storage | Cloudflare D1 (SQLite) | Recommended |
| D7 | Payments | Stripe Checkout (hosted). Card data never touches this site. | Recommended |
| D8 | Transactional email (confirmations) | Resend | Recommended |
| D9 | Email list provider | — | **Open** (Kit, Mailchimp, ActiveCampaign, etc.). Build behind one adapter function. |
| D10 | Waiver, refund and weather text | Drafts in `content/` | **Open — needs Tennessee attorney review before launch.** |
| D11 | Class capacity per Wednesday | No limit for v1 | Deferred by owner |
| D12 | Registration cutoff | Same-day registration closes at 10:00 AM CT on class day | Confirm |
| D13 | Blackout dates (no class) | Config list of ISO dates, empty by default | Confirm |
| D14 | Owner notification | Email to owner on every paid registration, with roster CSV link | Recommended |
| D15 | NCRT approval for reuse of ncrteam.com copy and photos | — | **Open — confirm with NCRT before publishing** |

---

## 2. Pages and routes

| Route | Prototype file | Purpose |
|---|---|---|
| `/` | `prototype/Main.dc.html` | Home. Featured course, coming-soon catalog, email list, NCRT teaser, location/contact, policies. |
| `/ncrt` | `prototype/NCRT.dc.html` | NCRT courses page (content from ncrteam.com, restyled in the site's look). |
| `/register` | `prototype/Register.dc.html` | 3-step registration: details → waiver → review & pay. |
| `/register/confirmed` | Done state in `Register.dc.html` | Shown after Stripe success redirect. |
| `/policies` (optional) | Policies section of `Main.dc.html` | Same content as the home section, linkable. |

Shared chrome on every page: top bar (brand left; nav: Courses, NCRT, Location, solid **Register** button) and footer (© year, org name, Middle Tennessee, links). Nav "Courses" and "Location" go to `/#course` and `/#location`.

**Never publish the training address anywhere on the site.** Copy says the location is emailed.

---

## 3. Design system

Two related looks. Use real CSS custom properties; never hardcode hex values in components.

- **Site look (all pages, including /ncrt):** `design/site-tokens.css`. Dark olive-charcoal ground, bone ink, one ember accent, Barlow Condensed display + Barlow text, square corners, solid ember primary buttons, frosted panels with a 3px ember top rule, grain texture over a scrimmed fixed background photo.
- **NCRT brand reference:** `design/ncrt-tokens.json` and `design/ncrt-components/` are NCRT's own design system. The site's components were built from these and recolored. Use them as structural reference for the five components below; the site look overrides their colors and type.

Components to build (names from the prototype):

| Component | Notes |
|---|---|
| `Button` | Outline (2px) default; `solid` variant = ember fill, night text. Optional trailing down-arrow icon for in-page scroll buttons. Renders `<a>` when given `href`, else `<button>`. |
| `TextField` | Label (uppercase condensed) + input or textarea. 1px border, transparent, square. |
| `Panel` | `frosted` (panel fill + grain + 0.75rem backdrop blur + ember top rule) or `clear`. |
| `SectionHeader` | Ember eyebrow over condensed uppercase title; sizes `section` (3rem) and `tier` (2.25rem). |
| `CourseItem` | Condensed uppercase name over a body description. |

Also: date "pill" buttons (selected = ember fill, `aria-pressed`), custom square checkbox, fact tiles (label + value with a hairline top border), scrollable waiver box.

Breakpoints: 980px (root font 15px), 736px (single column, 1.5rem side gutters, smaller display sizes). Must work at 320px wide with no horizontal scroll.

Background photos: `/` and `/register` and `/ncrt` use `assets/images/image06_litter-rigging-overlook.jpg` under the scrim. Grain texture is the inline SVG in `design/ncrt-components/bundle.css` (`.ncrt-backdrop`).

---

## 4. Content

- All page copy is in the prototype files as literal text. Use it verbatim.
- Placeholders to replace from config: `[Organization name]`, `[Phone number]`, `[Email address]`, `[Price]`. `tel:` and `mailto:` links must use the config values.
- Home course photo is a placeholder box ("Class photo: fire, water or shelter"). Leave a slot; the owner will supply a photo.
- Legal and policy text lives in `content/waiver.md` and `content/policies.md`. Render from those files so attorney edits don't touch code.
- NCRT page: the YouTube video (`SbS8AjeXPLM`) is a link-out box in the prototype. **Embed it** with `youtube-nocookie.com`, lazy-loaded, 16:9.
- Images: `assets/images/` (mapping to prototype `/_blob/` ids is in `prototype/README.md`). Serve responsive, compressed versions (AVIF/WebP + JPEG fallback) with `alt` text from the prototype.

---

## 5. Registration flow (`/register`)

### Step 1 — Details
- **Class date:** buttons for the next 6 Wednesdays (America/Chicago), excluding blackout dates and any date past the cutoff (D12). One selected by default (the first).
- **Students** (repeatable, min 1, "Add another student", "Remove" when >1):
  - Full name (required)
  - Age (required, integer 1–120)
  - Parent or legal guardian full name — shown and required **only when age < 18**
  - Food allergies, Medication allergies, Other allergies (optional; placeholder "None")
- **Your contact information:** Phone (required, tel), Email (required, valid email)
- **Emergency contact:** Name (required), Phone (required)
- Checkbox: "Add me to the email list for training locations and new courses" (default checked)
- Validation: list every missing field in an `role="alert"` summary above the submit button; also mark fields `aria-invalid`.

### Step 2 — Release of liability
- Full waiver text from `content/waiver.md` in a keyboard-scrollable region.
- One typed-signature field per student:
  - Adult student → label "{name}: type your full name"; must match the student's name.
  - Minor → label "Parent or legal guardian of {name}: type {guardian}'s full name"; must match the guardian name.
  - Match is case-insensitive with whitespace collapsed.
- Required checkbox: agree to the release.
- Optional checkbox (default off): photo/video release.
- Show the signing date.

### Step 3 — Review and pay
- Summary: date, students (age, guardian if minor, allergies or "None listed"), contact, emergency contact, who signed and when, photo release granted / not granted.
- Refund/rescheduling and weather policies (from `content/policies.md`) + **required** checkbox "I have read and agree to the refund, rescheduling and weather policies."
- Payment summary: "{n} student(s) × ${price} per student", Total.
- **Continue to secure checkout** →
  1. POST to `/api/registrations` → server re-validates everything, stores the registration with `status = pending_payment`, creates a Stripe Checkout Session (line item = course, quantity = student count, unit amount = config price, `client_reference_id` = registration id, customer email prefilled, metadata includes class date), returns its URL.
  2. Redirect to Stripe.
  3. Stripe `checkout.session.completed` webhook → mark `paid`, store payment intent id and amount, send confirmation email to registrant and notification to owner, add to email list if opted in.
  4. Success URL → `/register/confirmed?r={id}` shows the confirmation state from the prototype (date, "we'll email the training location to {email}", contact info). Cancel URL → back to step 3 with data intact.
- Never trust client totals; compute price server-side.

### Confirmation email (registrant)
Subject: "You're registered: Wilderness Survival Fundamentals, {date}". Body: date and time (1:00–4:00 PM), students, total paid, "We'll email the training location before class", refund/weather policy summary, contact info. No address.

---

## 6. Data model (D1)

```
registrations
  id TEXT PK (ulid)
  created_at TEXT
  class_date TEXT            -- YYYY-MM-DD
  contact_phone TEXT
  contact_email TEXT
  emergency_name TEXT
  emergency_phone TEXT
  email_list_opt_in INTEGER
  photo_release INTEGER
  policies_agreed_at TEXT
  waiver_version TEXT        -- e.g. "2026-10-06"
  waiver_sha256 TEXT         -- hash of the exact waiver text shown
  signed_at TEXT
  signer_ip TEXT
  signer_user_agent TEXT
  status TEXT                -- pending_payment | paid | cancelled | refunded | credited
  unit_price_cents INTEGER
  total_cents INTEGER
  stripe_session_id TEXT
  stripe_payment_intent TEXT

students
  id TEXT PK
  registration_id TEXT FK
  position INTEGER
  full_name TEXT
  age INTEGER
  guardian_name TEXT NULL
  food_allergies TEXT
  medication_allergies TEXT
  other_allergies TEXT
  signature_typed TEXT
  signer_role TEXT           -- self | guardian

waiver_versions
  version TEXT PK
  sha256 TEXT
  body_markdown TEXT
  effective_at TEXT
```

Keep every waiver version forever; each registration points at the exact version and hash it was signed under. Medical/allergy data is sensitive: restrict access, no analytics on these fields, HTTPS only.

---

## 7. Other features

- **Email list signup (home):** email field + "Join the list" → `/api/subscribe` → provider adapter (D9). Success replaces the form with "You're on the list…" (prototype copy). Honeypot field for spam.
- **NCRT interest form (/ncrt):** First Name, Last Name, Email, "Which course(s) are you interested in?" → `/api/ncrt-interest` → email to the owner (and NCRT contact if provided). Success message: "Thank you. Your message has been sent." Honeypot field.
- **Owner roster:** simplest version is a protected page (Cloudflare Access) at `/admin` listing paid registrations by class date with a CSV export. Optional for v1 if D14 email notifications are in place.

---

## 8. Non-functional

- Accessibility: WCAG 2.1 AA. Real `<button>`/`<a>`/`<label>`; visible focus ring (2px ember, 3px offset); ≥44px targets; text contrast ≥4.5:1 (ember #e2863a on #13150f ≈ 6.7:1).
- Performance: static HTML for marketing pages; Lighthouse ≥90 on mobile.
- SEO: title/description per page, Open Graph image (`assets/images/share_ncrt-wordmark.jpg` for /ncrt; an org image once named), `LocalBusiness`/`Course` JSON-LD **without** a street address (areaServed: Middle Tennessee).
- Secrets (Stripe keys, webhook secret, Resend key, list API key) in Cloudflare environment variables only.
- Times shown and computed in America/Chicago.

---

## 9. Acceptance criteria

1. All three pages match the prototype at 1440px and collapse cleanly at 736px and 320px.
2. No training address appears anywhere in HTML, metadata or emails.
3. A registration for 1 adult + 1 minor: guardian field appears only for the minor; signatures must match name/guardian; can't proceed without waiver agreement or policy agreement.
4. Stripe test mode: total = config price × student count; paid webhook flips status to `paid`; confirmation and owner emails send; cancelled checkout returns to review with data intact.
5. Dates: only upcoming Wednesdays; blackout dates and past-cutoff dates never appear.
6. Stored registration includes waiver version + hash, signed time, IP, user agent.
7. Changing price, phone, email or org name in config updates every page and email.
8. Email list and NCRT interest forms work and reject honeypot submissions.
9. Keyboard-only user can complete registration; axe shows no serious violations.
