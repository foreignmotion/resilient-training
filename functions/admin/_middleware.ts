import type { Fn } from '../_lib/env.ts';
import { verifyAccess } from '../_lib/access.ts';

export const onRequest: Fn = async (ctx) => {
  const who = await verifyAccess(ctx.request, ctx.env);
  if (!who) return new Response('Not authorized. /admin is protected by Cloudflare Access.', { status: 403 });
  const res = await ctx.next();
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'no-store');
  out.headers.set('X-Robots-Tag', 'noindex');
  return out;
};
