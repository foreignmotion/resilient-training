# CLAUDE.md — [Organization name] training site

You are building a production website from an approved prototype. Read these first, in order:

1. `SPEC.md` — what to build, decisions, data model, acceptance criteria.
2. `prototype/README.md` — how to read the prototype files.
3. `prototype/*.dc.html` — the approved design and the exact copy.
4. `design/site-tokens.css` — the design tokens and base styles to use.
5. `content/waiver.md`, `content/policies.md` — legal/policy text, rendered from these files.

## Rules

- **Before writing code, list the open decisions in SPEC.md §1 and ask the owner to confirm them.** Use the defaults only for decisions marked "Recommended" if the owner says to proceed.
- Match the prototype's layout, type, color and copy. Copy is final unless the owner changes it; don't rewrite it.
- Keep org name, phone, email, price, blackout dates and cutoff in one config module. No hardcoded values in pages or emails.
- **Never put the training address anywhere** — pages, metadata, JSON-LD, emails.
- Payment card data must never touch this site; use Stripe Checkout. Compute prices server-side.
- Store each signed waiver with its exact version and hash (SPEC §6). Treat allergy and medical fields as sensitive.
- Use the design tokens as CSS custom properties. No hardcoded hex values in components.
- Accessibility is a requirement: real buttons, links and labels, visible focus, ≥44px targets, AA contrast.
- Don't use the `.dc.html` runtime (`x-dc`, `x-import`, `sc-if`, `sc-for`, `{{ }}`, `support.js`, `bundle.js`) in production. It's a prototype format; rebuild the markup as real components.
- Work in small, reviewable steps; run the acceptance criteria in SPEC §9 before calling anything done.
