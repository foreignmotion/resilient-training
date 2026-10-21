import type { Fn } from '../../_lib/env.ts';
import { json } from '../../_lib/http.ts';

/** GET /api/registrations/:id — just enough for the confirmation page. No medical data. */
export const onRequestGet: Fn = async ({ params, env }) => {
  const id = String(params.id ?? '');
  if (!/^[0-9A-Z]{26}$/.test(id)) return json({ error: 'Not found' }, 404);
  const row = await env.DB.prepare(
    `SELECT class_date, contact_email, status, payment_method, total_cents,
       (SELECT COUNT(*) FROM students WHERE registration_id = registrations.id) AS students
     FROM registrations WHERE id = ?`,
  )
    .bind(id)
    .first<{ class_date: string; contact_email: string; status: string; payment_method: string; total_cents: number; students: number }>();
  if (!row) return json({ error: 'Not found' }, 404);
  return json({
    classDate: row.class_date,
    email: row.contact_email,
    status: row.status,
    paymentMethod: row.payment_method,
    totalCents: row.total_cents,
    students: row.students,
  });
};
