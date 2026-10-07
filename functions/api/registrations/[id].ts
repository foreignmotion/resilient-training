import type { Fn } from '../../_lib/env.ts';
import { json } from '../../_lib/http.ts';

/** GET /api/registrations/:id — just enough for the confirmation page. No medical data. */
export const onRequestGet: Fn = async ({ params, env }) => {
  const id = String(params.id ?? '');
  if (!/^[0-9A-Z]{26}$/.test(id)) return json({ error: 'Not found' }, 404);
  const row = await env.DB.prepare('SELECT class_date, contact_email, status FROM registrations WHERE id = ?')
    .bind(id)
    .first<{ class_date: string; contact_email: string; status: string }>();
  if (!row) return json({ error: 'Not found' }, 404);
  return json({ classDate: row.class_date, email: row.contact_email, status: row.status });
};
