import { validEmail } from '../../shared/registration.ts';
import type { Fn } from '../_lib/env.ts';
import { json, readBody, sameOrigin, str, wantsJson } from '../_lib/http.ts';
import { addToList } from '../_lib/list.ts';

/** POST /api/subscribe — home page email list signup. */
export const onRequestPost: Fn = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: 'Bad origin.' }, 403);
  const body = await readBody(request);
  if (!body) return json({ error: 'Invalid request.' }, 400);
  const done = () => (wantsJson(request) ? json({ ok: true }) : Response.redirect(new URL('/?joined=1#list', request.url).href, 303));

  // Honeypot: pretend success so bots learn nothing.
  if (str(body.company)) return done();

  const email = str(body.email, 254);
  if (!validEmail(email)) return json({ error: 'Please enter a valid email address.' }, 422);
  try {
    await addToList(env, { email, source: str(body.source, 40) || 'home' });
  } catch (err) {
    console.error(err);
    return json({ error: 'We couldn’t add you just now.' }, 502);
  }
  return done();
};
