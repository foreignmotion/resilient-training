import type { Env } from './env.ts';

/**
 * Posts to the Google Apps Script web app bound to the "Wednesday Class Signup Sheet"
 * (see docs/google-sheet.md). The script writes `registration` rows to the
 * "Registrations" tab and `list` rows to the "Email list" tab.
 */
export async function postToSheet(env: Env, payload: { type: 'registration' | 'list'; [key: string]: unknown }): Promise<void> {
  if (!env.SHEET_WEBHOOK_URL) {
    console.log(`sheet (not saved, no SHEET_WEBHOOK_URL): ${payload.type}`);
    return;
  }
  const res = await fetch(env.SHEET_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: env.SHEET_WEBHOOK_SECRET ?? '', ...payload }),
    redirect: 'follow',
  });
  const text = await res.text();
  if (!res.ok || !text.includes('"ok":true')) throw new Error(`Sheet webhook failed (${res.status}): ${text.slice(0, 200)}`);
}

export interface SheetStudent {
  name: string;
  age: number;
  guardian: string;
  food: string;
  meds: string;
  other: string;
  signature: string;
}

export interface SheetRegistration {
  registrationId: string;
  paidAt: string;
  classDate: string;
  contactPhone: string;
  contactEmail: string;
  emergencyName: string;
  emergencyPhone: string;
  photoRelease: boolean;
  amountPaid: string;
  students: SheetStudent[];
}

/** One row per student on the Registrations tab. */
export const addRegistrationToSheet = (env: Env, reg: SheetRegistration) => postToSheet(env, { type: 'registration', ...reg });
