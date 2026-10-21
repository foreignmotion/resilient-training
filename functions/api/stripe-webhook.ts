import type { Fn } from '../_lib/env.ts';
import { json } from '../_lib/http.ts';
import { notifyRegistered } from '../_lib/notify.ts';
import { verifyStripeSignature } from '../_lib/stripe.ts';

interface CheckoutSession {
  id: string;
  client_reference_id: string | null;
  payment_intent: string | null;
  amount_total: number | null;
  payment_status: string;
}

/**
 * POST /api/stripe-webhook
 * Stripe events: checkout.session.completed (and async_payment_succeeded) mark the
 * registration paid and send emails; checkout.session.expired marks it cancelled.
 * Idempotent: only a pending registration transitions, so retries never double-send.
 */
export const onRequestPost: Fn = async ({ request, env, waitUntil }) => {
  const payload = await request.text();
  if (!(await verifyStripeSignature(payload, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET))) {
    return json({ error: 'Bad signature' }, 400);
  }
  const event = JSON.parse(payload) as { type: string; data: { object: CheckoutSession } };
  const session = event.data.object;
  const id = session.client_reference_id;
  if (!id) return json({ received: true });

  if (event.type === 'checkout.session.expired') {
    await env.DB.prepare("UPDATE registrations SET status = 'cancelled' WHERE id = ? AND status = 'pending_payment'").bind(id).run();
    return json({ received: true });
  }

  const paidEvent =
    (event.type === 'checkout.session.completed' && session.payment_status === 'paid') ||
    event.type === 'checkout.session.async_payment_succeeded';
  if (!paidEvent) return json({ received: true });

  const result = await env.DB.prepare(
    `UPDATE registrations SET status = 'paid', stripe_payment_intent = ?, amount_paid_cents = ?, paid_at = ?, stripe_session_id = ?
     WHERE id = ? AND status = 'pending_payment'`,
  )
    .bind(session.payment_intent, session.amount_total, new Date().toISOString(), session.id, id)
    .run();

  if (result.meta.changes > 0) waitUntil(notifyRegistered(env, id, new URL(request.url).origin));
  return json({ received: true });
};
