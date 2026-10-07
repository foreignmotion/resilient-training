import { course, hasPrice, legal } from '../../../shared/config.ts';
import { formatClassDate, upcomingClassDates } from '../../../shared/dates.ts';
import { sha256Hex, waiverText } from '../../../shared/legal.ts';
import { isMinor, sanitize, signerFor, validateDetails, validateReview, validateWaiver } from '../../../shared/registration.ts';
import type { Fn } from '../../_lib/env.ts';
import { json, sameOrigin, ulid } from '../../_lib/http.ts';
import { stripeRequest } from '../../_lib/stripe.ts';

/**
 * POST /api/registrations
 * Re-validates everything, stores the registration as pending_payment with the exact
 * waiver version + hash, creates a Stripe Checkout Session and returns its URL.
 * The price comes from config only; client totals are ignored.
 */
export const onRequestPost: Fn = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: 'Bad origin.' }, 403);
  if (!hasPrice()) return json({ error: 'Online registration opens once the course price is set.' }, 503);

  const input = sanitize(await request.json().catch(() => null));
  if (!input) return json({ error: 'Invalid request.' }, 400);

  if (input.waiverVersion !== legal.waiverVersion) {
    return json({ error: 'The release of liability was updated. Please reload the page, review it and sign again.' }, 409);
  }

  const errors = [...validateDetails(input, upcomingClassDates()), ...validateWaiver(input), ...validateReview(input)];
  if (errors.length) {
    const friendly = errors.map((e) =>
      e.key === 'date' ? { ...e, message: 'That class date is no longer open. Go back to your details and pick another Wednesday.' } : e,
    );
    return json({ errors: friendly }, 422);
  }

  const id = ulid();
  const now = new Date().toISOString();
  const waiver = waiverText();
  const waiverHash = await sha256Hex(waiver);
  const n = input.students.length;
  const unit = course.priceCents;
  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  const ua = (request.headers.get('User-Agent') ?? '').slice(0, 500);

  const stmts = [
    env.DB.prepare('INSERT OR IGNORE INTO waiver_versions (version, sha256, body_markdown, effective_at) VALUES (?, ?, ?, ?)').bind(
      legal.waiverVersion, waiverHash, waiver, now,
    ),
    env.DB.prepare(
      `INSERT INTO registrations (id, created_at, class_date, contact_phone, contact_email, emergency_name, emergency_phone,
        email_list_opt_in, photo_release, policies_agreed_at, waiver_version, waiver_sha256, signed_at, signer_ip,
        signer_user_agent, status, unit_price_cents, total_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?)`,
    ).bind(
      id, now, input.date, input.phone.trim(), input.email.trim(), input.emName.trim(), input.emPhone.trim(),
      input.list ? 1 : 0, input.photo ? 1 : 0, now, legal.waiverVersion, waiverHash, now, ip, ua, unit, unit * n,
    ),
    ...input.students.map((s, i) => {
      const signer = signerFor(s, i);
      return env.DB.prepare(
        `INSERT INTO students (id, registration_id, position, full_name, age, guardian_name, food_allergies,
          medication_allergies, other_allergies, signature_typed, signer_role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        ulid(), id, i + 1, s.name.trim(), Number(s.age), isMinor(s) ? s.guardian.trim() : null,
        s.food.trim(), s.meds.trim(), s.other.trim(), (input.sigs[String(s.id)] ?? '').trim(), signer.role,
      );
    }),
  ];

  // If a stored version has the same label but different text, someone edited waiver.md without bumping the version.
  const existing = await env.DB.prepare('SELECT sha256 FROM waiver_versions WHERE version = ?').bind(legal.waiverVersion).first<{ sha256: string }>();
  if (existing && existing.sha256 !== waiverHash) {
    console.error('waiver text changed without a version bump', legal.waiverVersion);
    return json({ error: 'Registration is temporarily unavailable. Please call or email us.' }, 500);
  }

  await env.DB.batch(stmts);

  const origin = new URL(request.url).origin;
  try {
    const session = await stripeRequest<{ id: string; url: string }>(env.STRIPE_SECRET_KEY, 'checkout/sessions', {
      mode: 'payment',
      'line_items[0][price_data][currency]': course.currency,
      'line_items[0][price_data][unit_amount]': unit,
      'line_items[0][price_data][product_data][name]': course.name,
      'line_items[0][price_data][product_data][description]': `${formatClassDate(input.date)}, ${course.timeLabel}`,
      'line_items[0][quantity]': n,
      customer_email: input.email.trim(),
      client_reference_id: id,
      'metadata[registration_id]': id,
      'metadata[class_date]': input.date,
      'payment_intent_data[metadata][registration_id]': id,
      'payment_intent_data[metadata][class_date]': input.date,
      success_url: `${origin}/register/confirmed/?r=${id}`,
      cancel_url: `${origin}/register/?canceled=1`,
    });
    await env.DB.prepare('UPDATE registrations SET stripe_session_id = ? WHERE id = ?').bind(session.id, id).run();
    return json({ url: session.url, id });
  } catch (err) {
    console.error(err);
    await env.DB.prepare("UPDATE registrations SET status = 'cancelled' WHERE id = ?").bind(id).run();
    return json({ error: 'We couldn’t start checkout. Please try again in a minute, or call or email us.' }, 502);
  }
};
