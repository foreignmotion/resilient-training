import type { Env } from './env.ts';

export interface ListContact {
  email: string;
  source: 'home' | 'registration' | string;
  name?: string;
  phone?: string;
}

/**
 * Email-list adapter (D9). Currently appends a row to a Google Sheet through a
 * Google Apps Script web app (see docs/google-sheet-list.md). To move to Kit,
 * Mailchimp, ActiveCampaign, etc., replace the body of this function only.
 */
export async function addToList(env: Env, contact: ListContact): Promise<void> {
  if (!env.LIST_WEBHOOK_URL) {
    console.log('list (not saved, no LIST_WEBHOOK_URL):', contact.email, contact.source);
    return;
  }
  const res = await fetch(env.LIST_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: env.LIST_WEBHOOK_SECRET ?? '', ...contact, at: new Date().toISOString() }),
    redirect: 'follow',
  });
  const text = await res.text();
  if (!res.ok || !text.includes('"ok":true')) throw new Error(`List webhook failed (${res.status}): ${text.slice(0, 200)}`);
}
