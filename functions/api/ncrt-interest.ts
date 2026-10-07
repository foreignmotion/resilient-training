import { site } from '../../shared/config.ts';
import { validEmail } from '../../shared/registration.ts';
import { sendEmail } from '../_lib/email.ts';
import type { Fn } from '../_lib/env.ts';
import { json, readBody, sameOrigin, str, wantsJson } from '../_lib/http.ts';

/** POST /api/ncrt-interest — the NCRT "Get in touch" form. Emails the owner (and NCRT, if configured). */
export const onRequestPost: Fn = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: 'Bad origin.' }, 403);
  const body = await readBody(request);
  if (!body) return json({ error: 'Invalid request.' }, 400);
  const done = () => (wantsJson(request) ? json({ ok: true }) : Response.redirect(new URL('/ncrt/?sent=1#contact', request.url).href, 303));
  if (str(body.company)) return done();

  const firstName = str(body.firstName, 100);
  const lastName = str(body.lastName, 100);
  const email = str(body.email, 254);
  const message = str(body.message, 4000);
  if (!firstName || !lastName || !validEmail(email) || !message) {
    return json({ error: 'Please fill in your first name, last name, a valid email and the course(s) you’re interested in.' }, 422);
  }

  try {
    await sendEmail(env, {
      to: [site.ownerEmail, site.ncrtEmail].filter(Boolean),
      subject: `NCRT course interest: ${firstName} ${lastName}`,
      text: `${firstName} ${lastName} <${email}> is interested in NCRT courses.\n\nWhich course(s):\n${message}\n\nSent from the NCRT page on ${site.orgName}'s website.`,
      replyTo: email,
    });
  } catch (err) {
    console.error(err);
    return json({ error: 'We couldn’t send your message just now.' }, 502);
  }
  return done();
};
