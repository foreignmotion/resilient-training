import type { Fn } from '../_lib/env.ts';
import { loadRoster } from '../_lib/roster.ts';

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  // Quote, and neutralize spreadsheet formula injection.
  return `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
};

/** GET /admin/roster?date=YYYY-MM-DD — CSV of paid students. */
export const onRequestGet: Fn = async ({ request, env }) => {
  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const rows = await loadRoster(env.DB, date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null, url.searchParams.get('all') === '1');
  const header = ['Class date', 'Student', 'Age', 'Guardian', 'Food allergies', 'Medication allergies', 'Other allergies', 'Contact phone', 'Contact email', 'Emergency contact', 'Emergency phone', 'Photo release', 'Signed by', 'Signed at', 'Waiver version', 'Status', 'Registration ID'];
  const lines = rows.map((r) =>
    [r.class_date, r.full_name, r.age, r.guardian_name ?? '', r.food_allergies, r.medication_allergies, r.other_allergies, r.contact_phone, r.contact_email, r.emergency_name, r.emergency_phone, r.photo_release ? 'yes' : 'no', r.signature_typed, r.signed_at, r.waiver_version, r.status, r.id].map(cell).join(','),
  );
  return new Response([header.map(cell).join(','), ...lines].join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="roster-${date ?? 'upcoming'}.csv"`,
    },
  });
};
