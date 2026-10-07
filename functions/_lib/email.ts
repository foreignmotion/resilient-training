import { site } from '../../shared/config.ts';
import type { Env } from './env.ts';

interface Mail {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

/** Send through Resend. Without an API key (local dev) the message is logged instead. */
export async function sendEmail(env: Env, mail: Mail): Promise<void> {
  const to = (Array.isArray(mail.to) ? mail.to : [mail.to]).filter((a) => a.includes('@'));
  if (!to.length) {
    console.warn('email: no valid recipient for', mail.subject);
    return;
  }
  if (!env.RESEND_API_KEY) {
    console.log('email (not sent, no RESEND_API_KEY):', { to, subject: mail.subject });
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: site.fromEmail, to, subject: mail.subject, text: mail.text, html: mail.html, reply_to: mail.replyTo }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
