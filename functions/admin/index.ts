import { site } from '../../shared/config.ts';
import { formatClassDate } from '../../shared/dates.ts';
import type { Fn } from '../_lib/env.ts';
import { escapeHtml as e } from '../_lib/http.ts';
import { loadRoster } from '../_lib/roster.ts';

/** GET /admin — upcoming paid students grouped by class date. */
export const onRequestGet: Fn = async ({ env }) => {
  const rows = await loadRoster(env.DB, null, false);
  const byDate = new Map<string, typeof rows>();
  rows.forEach((r) => byDate.set(r.class_date, [...(byDate.get(r.class_date) ?? []), r]));

  const sections = [...byDate].map(([date, list]) => `
    <section>
      <h2>${e(formatClassDate(date))} <small>${list.length} student${list.length === 1 ? '' : 's'}</small> <a href="/admin/roster?date=${date}">CSV</a></h2>
      <table>
        <thead><tr><th>Student</th><th>Age</th><th>Guardian</th><th>Allergies</th><th>Contact</th><th>Emergency</th><th>Photo</th></tr></thead>
        <tbody>${list.map((r) => `<tr>
          <td>${e(r.full_name)}</td><td>${r.age}</td><td>${e(r.guardian_name ?? '')}</td>
          <td>${e([r.food_allergies && 'Food: ' + r.food_allergies, r.medication_allergies && 'Meds: ' + r.medication_allergies, r.other_allergies && 'Other: ' + r.other_allergies].filter(Boolean).join('; ') || 'None')}</td>
          <td>${e(r.contact_phone)}<br>${e(r.contact_email)}</td><td>${e(r.emergency_name)}<br>${e(r.emergency_phone)}</td><td>${r.photo_release ? 'Yes' : 'No'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </section>`).join('');

  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Roster | ${e(site.orgName)}</title>
<style>
  body{margin:0;padding:2rem;background:#13150f;color:#ede7da;font:16px/1.5 system-ui,sans-serif}
  h1,h2{font-family:'Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.04em}
  h2{margin-top:3rem;border-top:3px solid #e2863a;padding-top:1rem}small{font-size:.9rem;color:#b8b0a0;letter-spacing:0;text-transform:none;margin:0 1rem}
  a{color:#e2863a}table{width:100%;border-collapse:collapse;font-size:.95rem}th,td{text-align:left;vertical-align:top;padding:.5rem .75rem;border-bottom:1px solid rgba(237,231,218,.18)}
  th{color:#e2863a;font-weight:600}.wrap{overflow-x:auto}
</style></head><body>
<h1>Upcoming roster</h1>
<p><a href="/admin/roster">Download all upcoming (CSV)</a></p>
<div class="wrap">${sections || '<p>No paid registrations for upcoming classes yet.</p>'}</div>
</body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
