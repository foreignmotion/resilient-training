import type { Env } from './env.ts';

/**
 * Verify the Cloudflare Access JWT on /admin requests. Access must be configured in
 * the Cloudflare dashboard for this path; this check makes sure a misconfiguration
 * fails closed instead of exposing registrations.
 */
const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));

let jwksCache: { at: number; keys: JsonWebKey[] } | null = null;

export async function verifyAccess(request: Request, env: Env): Promise<string | null> {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64url(h)));
    const payload = JSON.parse(new TextDecoder().decode(b64url(p)));
    if (!jwksCache || Date.now() - jwksCache.at > 3600_000) {
      const res = await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`);
      jwksCache = { at: Date.now(), keys: ((await res.json()) as { keys: JsonWebKey[] }).keys };
    }
    const jwk = jwksCache.keys.find((k: any) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), new TextEncoder().encode(`${h}.${p}`));
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!ok || !aud.includes(env.ACCESS_AUD) || payload.exp * 1000 < Date.now()) return null;
    return payload.email ?? 'unknown';
  } catch {
    return null;
  }
}
