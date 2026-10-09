import type { Env } from './env.ts';
import { postToSheet } from './sheet.ts';

export interface ListContact {
  email: string;
  source: 'home' | 'registration' | string;
  name?: string;
  phone?: string;
}

/**
 * Email-list adapter (D9). Currently appends a row to the "Email list" tab of the
 * signup Google Sheet (see docs/google-sheet.md). To move to Kit, Mailchimp,
 * ActiveCampaign, etc., replace the body of this function only.
 */
export async function addToList(env: Env, contact: ListContact): Promise<void> {
  await postToSheet(env, { type: 'list', ...contact, at: new Date().toISOString() });
}
