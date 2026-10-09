import { course, formatMoney, site } from '../../shared/config.ts';
import { formatClassDate } from '../../shared/dates.ts';
import { policiesPlain } from '../../shared/legal.ts';
import { sendEmail } from '../_lib/email.ts';
import type { Env, Fn } from '../_lib/env.ts';
import { escapeHtml, json } from '../_lib/http.ts';
import { addToList } from '../_lib/list.ts';
import { addRegistrationToSheet } from '../_lib/sheet.ts';
import { verifyStripeSignature } from '../_lib/stripe.ts';

interface CheckoutSession {
  id: string;
  client_reference_id: string | null;
  payment_intent: string | null;
  amount_total: number | null;
  payment_status: string;
}

/**
 * POST /api/stripe-webhook
 * Stripe events: checkout.session.completed (and async_payment_succeeded) mark the
 * registration paid and send emails; checkout.session.expired marks it cancelled.
 * Idempotent: only a pending registration transitions, so retries never double-send.
 */
export const onRequestPost: Fn = async ({ request, env, waitUntil }) => {
  const payload = await request.text();
  if (!(await verifyStripeSignature(payload, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET))) {
    return json({ error: 'Bad signature' }, 400);
  }
  const event = JSON.parse(payload) as { type: string; data: { object: CheckoutSession } };
  const session = event.data.object;
  const id = session.client_reference_id;
  if (!id) return json({ received: true });

  if (event.type === 'checkout.session.expired') {
    await env.DB.prepare("UPDATE registrations SET status = 'cancelled' WHERE id = ? AND status = 'pending_payment'").bind(id).run();
    return json({ received: true });
  }

  const paidEvent =
    (event.type === 'checkout.session.completed' && session.payment_status === 'paid') ||
    event.type === 'checkout.session.async_payment_succeeded';
  if (!paidEvent) return json({ received: true });

  const result = await env.DB.prepare(
    `UPDATE registrations SET status = 'paid', stripe_payment_intent = ?, amount_paid_cents = ?, paid_at = ?, stripe_session_id = ?
     WHERE id = ? AND status = 'pending_payment'`,
  )
    .bind(session.payment_intent, session.amount_total, new Date().toISOString(), session.id, id)
    .run();

  if (result.meta.changes > 0) waitUntil(afterPaid(env, id, new URL(request.url).origin));
  return json({ received: true });
};

async function afterPaid(env: Env, id: string, origin: string) {
  const reg = await env.DB.prepare('SELECT * FROM registrations WHERE id = ?').bind(id).first<Record<string, any>>();
  if (!reg) return;
  const { results: students } = await env.DB.prepare(
    `SELECT full_name, age, guardian_name, food_allergies, medication_allergies, other_allergies, signature_typed
     FROM students WHERE registration_id = ? ORDER BY position`,
  )
    .bind(id)
    .all<{
      full_name: string;
      age: number;
      guardian_name: string | null;
      food_allergies: string;
      medication_allergies: string;
      other_allergies: string;
      signature_typed: string;
    }>();

  const date = formatClassDate(reg.class_date);
  const total = formatMoney(reg.amount_paid_cents ?? reg.total_cents);
  const studentLines = students.map((s) => `- ${s.full_name}, age ${s.age}${s.guardian_name ? ` (guardian: ${s.guardian_name})` : ''}`).join('\n');
  const contact = `Call or text ${site.phoneDisplay} or email ${site.email}.`;

  const text = `You're registered for ${course.name}.

When: ${date}, ${course.timeLabel}
Where: ${site.region}. We'll email the training location before class.

Students:
${studentLines}

Total paid: ${total}

${policiesPlain()}

Questions? ${contact}

${site.orgName}`;

  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#13150f;max-width:560px">
<p style="font-size:20px;font-weight:bold;margin:0 0 16px">You're registered for ${escapeHtml(course.name)}.</p>
<p><strong>When:</strong> ${escapeHtml(date)}, ${escapeHtml(course.timeLabel)}<br><strong>Where:</strong> ${escapeHtml(site.region)}. We'll email the training location before class.</p>
<p><strong>Students</strong><br>${students.map((s) => escapeHtml(`${s.full_name}, age ${s.age}${s.guardian_name ? ` (guardian: ${s.guardian_name})` : ''}`)).join('<br>')}</p>
<p><strong>Total paid:</strong> ${escapeHtml(total)}</p>
<p style="white-space:pre-line;font-size:14px;color:#444">${escapeHtml(policiesPlain())}</p>
<p>Questions? ${escapeHtml(contact)}</p>
<p>${escapeHtml(site.orgName)}</p></div>`;

  const jobs: Promise<unknown>[] = [
    sendEmail(env, {
      to: reg.contact_email,
      subject: `You're registered: ${course.name}, ${date}`,
      text,
      html,
      replyTo: site.email.includes('@') ? site.email : undefined,
    }),
    sendEmail(env, {
      to: site.ownerEmail,
      subject: `New registration: ${date}, ${students.length} student${students.length === 1 ? '' : 's'}, ${total}`,
      text: `New paid registration (${id}).

Class: ${date}
Students:
${studentLines}

Contact: ${reg.contact_phone}, ${reg.contact_email}
Emergency: ${reg.emergency_name}, ${reg.emergency_phone}
Photo release: ${reg.photo_release ? 'granted' : 'not granted'}
Email list: ${reg.email_list_opt_in ? 'yes' : 'no'}
Total paid: ${total}

Roster: ${origin}/admin/
Roster CSV: ${origin}/admin/roster?date=${reg.class_date}`,
      replyTo: reg.contact_email,
    }),
  ];
  jobs.push(
    addRegistrationToSheet(env, {
      registrationId: id,
      paidAt: reg.paid_at,
      classDate: reg.class_date,
      contactPhone: reg.contact_phone,
      contactEmail: reg.contact_email,
      emergencyName: reg.emergency_name,
      emergencyPhone: reg.emergency_phone,
      photoRelease: !!reg.photo_release,
      amountPaid: total,
      students: students.map((s) => ({
        name: s.full_name,
        age: s.age,
        guardian: s.guardian_name ?? '',
        food: s.food_allergies,
        meds: s.medication_allergies,
        other: s.other_allergies,
        signature: s.signature_typed,
      })),
    }),
  );
  if (reg.email_list_opt_in) {
    jobs.push(addToList(env, { email: reg.contact_email, source: 'registration', name: students[0]?.full_name, phone: reg.contact_phone }));
  }
  const results = await Promise.allSettled(jobs);
  results.forEach((r) => r.status === 'rejected' && console.error('afterPaid:', r.reason));
}
