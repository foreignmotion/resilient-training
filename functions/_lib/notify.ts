import { course, formatMoney, payAtClassMessage, site } from '../../shared/config.ts';
import { formatClassDate } from '../../shared/dates.ts';
import { policiesPlain } from '../../shared/legal.ts';
import { sendEmail } from './email.ts';
import type { Env } from './env.ts';
import { escapeHtml } from './http.ts';
import { addToList } from './list.ts';
import { addRegistrationToSheet } from './sheet.ts';

/**
 * Runs once a registration is confirmed: after Stripe reports it paid, or right away for
 * pay-at-class registrations. Emails the registrant and the owner, adds the students to the
 * signup sheet, and adds the registrant to the email list if they opted in.
 */
export async function notifyRegistered(env: Env, id: string, origin: string): Promise<void> {
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

  const inPerson = reg.payment_method === 'in_person';
  const date = formatClassDate(reg.class_date);
  const total = formatMoney(inPerson ? reg.total_cents : (reg.amount_paid_cents ?? reg.total_cents));
  const paymentLine = inPerson ? payAtClassMessage(reg.total_cents, students.length) : `Total paid: ${total}`;
  const paymentShort = inPerson ? `${total} due at class` : `${total} paid online`;
  const studentLines = students.map((s) => `- ${s.full_name}, age ${s.age}${s.guardian_name ? ` (guardian: ${s.guardian_name})` : ''}`).join('\n');
  const contact = `Email ${site.email}.`;

  const text = `You're registered for ${course.name}.

When: ${date}, ${course.timeLabel}
Where: ${site.region}. We'll email the training location before class.

Students:
${studentLines}

${paymentLine}
${policiesPlain() ? `\n${policiesPlain()}\n` : ''}
Questions? ${contact}

${site.orgName}`;

  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#13150f;max-width:560px">
<p style="font-size:20px;font-weight:bold;margin:0 0 16px">You're registered for ${escapeHtml(course.name)}.</p>
<p><strong>When:</strong> ${escapeHtml(date)}, ${escapeHtml(course.timeLabel)}<br><strong>Where:</strong> ${escapeHtml(site.region)}. We'll email the training location before class.</p>
<p><strong>Students</strong><br>${students.map((s) => escapeHtml(`${s.full_name}, age ${s.age}${s.guardian_name ? ` (guardian: ${s.guardian_name})` : ''}`)).join('<br>')}</p>
<p><strong>Payment:</strong> ${escapeHtml(inPerson ? payAtClassMessage(reg.total_cents, students.length) : `${total} paid`)}</p>
${policiesPlain() ? `<p style="white-space:pre-line;font-size:14px;color:#444">${escapeHtml(policiesPlain())}</p>` : ''}
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
      subject: `New registration: ${date}, ${students.length} student${students.length === 1 ? '' : 's'}, ${paymentShort}`,
      text: `New registration (${id}). ${inPerson ? 'Pays in person at class.' : 'Paid online.'}

Class: ${date}
Students:
${studentLines}

Contact: ${reg.contact_phone}, ${reg.contact_email}
Emergency: ${reg.emergency_name}, ${reg.emergency_phone}
Photo release: ${reg.photo_release ? 'granted' : 'not granted'}
Email list: ${reg.email_list_opt_in ? 'yes' : 'no'}
Payment: ${paymentShort}

Roster: ${origin}/admin/
Roster CSV: ${origin}/admin/roster?date=${reg.class_date}`,
      replyTo: reg.contact_email,
    }),
    addRegistrationToSheet(env, {
      registrationId: id,
      registeredAt: inPerson ? reg.created_at : reg.paid_at,
      paidAt: inPerson ? reg.created_at : reg.paid_at, // older sheet scripts read paidAt
      classDate: reg.class_date,
      contactPhone: reg.contact_phone,
      contactEmail: reg.contact_email,
      emergencyName: reg.emergency_name,
      emergencyPhone: reg.emergency_phone,
      photoRelease: !!reg.photo_release,
      payment: paymentShort,
      amountPaid: paymentShort, // older sheet scripts read amountPaid
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
  ];
  if (reg.email_list_opt_in) {
    jobs.push(addToList(env, { email: reg.contact_email, source: 'registration', name: students[0]?.full_name, phone: reg.contact_phone }));
  }
  const results = await Promise.allSettled(jobs);
  results.forEach((r) => r.status === 'rejected' && console.error('notifyRegistered:', r.reason));
}
