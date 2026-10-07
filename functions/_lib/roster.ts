export interface RosterRow {
  id: string;
  class_date: string;
  status: string;
  contact_phone: string;
  contact_email: string;
  emergency_name: string;
  emergency_phone: string;
  photo_release: number;
  amount_paid_cents: number | null;
  signed_at: string;
  waiver_version: string;
  position: number;
  full_name: string;
  age: number;
  guardian_name: string | null;
  food_allergies: string;
  medication_allergies: string;
  other_allergies: string;
  signature_typed: string;
}

export async function loadRoster(db: D1Database, date: string | null, includeAll: boolean) {
  const where = [includeAll ? "r.status != 'pending_payment'" : "r.status = 'paid'"];
  const binds: string[] = [];
  if (date) {
    where.push('r.class_date = ?');
    binds.push(date);
  } else {
    where.push("r.class_date >= date('now', '-1 day')");
  }
  const { results } = await db
    .prepare(
      `SELECT r.id, r.class_date, r.status, r.contact_phone, r.contact_email, r.emergency_name, r.emergency_phone,
        r.photo_release, r.amount_paid_cents, r.signed_at, r.waiver_version,
        s.position, s.full_name, s.age, s.guardian_name, s.food_allergies, s.medication_allergies, s.other_allergies, s.signature_typed
       FROM registrations r JOIN students s ON s.registration_id = r.id
       WHERE ${where.join(' AND ')}
       ORDER BY r.class_date, r.created_at, s.position`,
    )
    .bind(...binds)
    .all<RosterRow>();
  return results;
}
