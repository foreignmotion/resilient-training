/**
 * Registration shape and validation, shared by the /register island (for instant
 * feedback) and /api/registrations (the authority). Ported from the prototype logic.
 */

export interface StudentInput {
  id: number;
  name: string;
  age: string;
  guardian: string;
  food: string;
  meds: string;
  other: string;
}

export interface RegistrationInput {
  date: string;
  students: StudentInput[];
  phone: string;
  email: string;
  emName: string;
  emPhone: string;
  list: boolean;
  /** Typed signatures keyed by student id. */
  sigs: Record<string, string>;
  agree: boolean;
  photo: boolean;
  policyAgree: boolean;
  waiverVersion: string;
}

export const MAX_STUDENTS = 12;
const MAX_LEN = 200;

export const blankStudent = (id: number): StudentInput => ({
  id,
  name: '',
  age: '',
  guardian: '',
  food: '',
  meds: '',
  other: '',
});

/** Case-insensitive, whitespace-collapsed comparison form. */
export const norm = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

const validAge = (age: string) => /^\d{1,3}$/.test(age.trim()) && +age >= 1 && +age <= 120;

export const isMinor = (s: StudentInput) => validAge(s.age) && Number(s.age) < 18;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const validEmail = (v: string) => EMAIL_RE.test(v.trim());

export interface Signer {
  id: number;
  expected: string;
  label: string;
  role: 'self' | 'guardian';
}

export function signerFor(s: StudentInput, i: number): Signer {
  const minor = isMinor(s);
  const who = s.name.trim() || `Student ${i + 1}`;
  return {
    id: s.id,
    expected: minor ? s.guardian : s.name,
    label: minor
      ? `Parent or legal guardian of ${who}: type ${s.guardian.trim() ? s.guardian.trim() + '’s' : 'your'} full name`
      : `${who}: type your full name`,
    role: minor ? 'guardian' : 'self',
  };
}

/** Field-keyed errors so the UI can mark inputs aria-invalid. Keys: "date", "s0.name", "phone", ... */
export type Errors = { key: string; message: string }[];

export function validateDetails(r: RegistrationInput, allowedDates?: string[]): Errors {
  const errs: Errors = [];
  if (!r.date || (allowedDates && !allowedDates.includes(r.date))) {
    errs.push({ key: 'date', message: 'Class date' });
  }
  if (!r.students.length) errs.push({ key: 'students', message: 'At least one student' });
  if (r.students.length > MAX_STUDENTS) errs.push({ key: 'students', message: `No more than ${MAX_STUDENTS} students per registration` });
  r.students.forEach((s, i) => {
    const n = `Student ${i + 1}`;
    if (!s.name.trim()) errs.push({ key: `s${i}.name`, message: `${n}: full name` });
    if (!validAge(s.age)) errs.push({ key: `s${i}.age`, message: `${n}: age (a whole number from 1 to 120)` });
    if (isMinor(s) && !s.guardian.trim()) errs.push({ key: `s${i}.guardian`, message: `${n}: parent or legal guardian` });
  });
  if (!r.phone.trim()) errs.push({ key: 'phone', message: 'Phone number' });
  if (!validEmail(r.email)) errs.push({ key: 'email', message: 'Email' });
  if (!r.emName.trim()) errs.push({ key: 'emName', message: 'Emergency contact name' });
  if (!r.emPhone.trim()) errs.push({ key: 'emPhone', message: 'Emergency contact phone' });
  return errs;
}

export function validateWaiver(r: RegistrationInput): Errors {
  const errs: Errors = [];
  r.students.forEach((s, i) => {
    const g = signerFor(s, i);
    const typed = r.sigs[String(s.id)] ?? '';
    const who = g.role === 'guardian' ? 'parent or legal guardian name' : 'student name';
    if (!typed.trim()) errs.push({ key: `sig${s.id}`, message: `Student ${i + 1}: signature` });
    else if (norm(typed) !== norm(g.expected)) {
      errs.push({ key: `sig${s.id}`, message: `Student ${i + 1}: signature must match the ${who} (${g.expected.trim()})` });
    }
  });
  if (!r.agree) errs.push({ key: 'agree', message: 'Agree to the release of liability' });
  return errs;
}

export function validateReview(r: RegistrationInput): Errors {
  return r.policyAgree
    ? []
    : [{ key: 'policyAgree', message: 'Agree to the refund, rescheduling and weather policies to continue.' }];
}

/** Server-side: coerce untrusted JSON into a RegistrationInput, trimming and length-capping strings. */
export function sanitize(body: unknown): RegistrationInput | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_LEN) : '');
  const students = Array.isArray(b.students) ? b.students.slice(0, MAX_STUDENTS + 1) : [];
  const sigsIn = b.sigs && typeof b.sigs === 'object' ? (b.sigs as Record<string, unknown>) : {};
  return {
    date: str(b.date),
    students: students.map((s: any, i: number) => ({
      id: Number.isInteger(s?.id) ? s.id : i + 1,
      name: str(s?.name),
      age: str(s?.age),
      guardian: str(s?.guardian),
      food: str(s?.food),
      meds: str(s?.meds),
      other: str(s?.other),
    })),
    phone: str(b.phone),
    email: str(b.email),
    emName: str(b.emName),
    emPhone: str(b.emPhone),
    list: b.list === true,
    sigs: Object.fromEntries(Object.entries(sigsIn).map(([k, v]) => [k, str(v)])),
    agree: b.agree === true,
    photo: b.photo === true,
    policyAgree: b.policyAgree === true,
    waiverVersion: str(b.waiverVersion),
  };
}

export function allergyText(s: StudentInput): string {
  const parts: string[] = [];
  if (s.food.trim()) parts.push('Food: ' + s.food.trim());
  if (s.meds.trim()) parts.push('Medications: ' + s.meds.trim());
  if (s.other.trim()) parts.push('Other: ' + s.other.trim());
  return parts.length ? parts.join(' · ') : 'None listed';
}
