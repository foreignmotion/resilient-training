-- Registrations, students and every waiver version ever signed (SPEC §6).
CREATE TABLE IF NOT EXISTS waiver_versions (
  version TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  effective_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  class_date TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  emergency_name TEXT NOT NULL,
  emergency_phone TEXT NOT NULL,
  email_list_opt_in INTEGER NOT NULL DEFAULT 0,
  photo_release INTEGER NOT NULL DEFAULT 0,
  policies_agreed_at TEXT NOT NULL,
  waiver_version TEXT NOT NULL REFERENCES waiver_versions(version),
  waiver_sha256 TEXT NOT NULL,
  signed_at TEXT NOT NULL,
  signer_ip TEXT,
  signer_user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid', 'cancelled', 'refunded', 'credited')),
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  paid_at TEXT,
  amount_paid_cents INTEGER
);
CREATE INDEX IF NOT EXISTS idx_registrations_date_status ON registrations (class_date, status);
CREATE INDEX IF NOT EXISTS idx_registrations_session ON registrations (stripe_session_id);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL,
  guardian_name TEXT,
  food_allergies TEXT NOT NULL DEFAULT '',
  medication_allergies TEXT NOT NULL DEFAULT '',
  other_allergies TEXT NOT NULL DEFAULT '',
  signature_typed TEXT NOT NULL,
  signer_role TEXT NOT NULL CHECK (signer_role IN ('self', 'guardian'))
);
CREATE INDEX IF NOT EXISTS idx_students_registration ON students (registration_id);
