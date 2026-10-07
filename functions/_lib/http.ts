export const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });

/** Accept JSON (enhanced forms) or urlencoded/multipart (no-JS fallback). */
export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const type = request.headers.get('Content-Type') || '';
  try {
    if (type.includes('application/json')) return (await request.json()) as Record<string, unknown>;
    if (type.includes('form')) return Object.fromEntries((await request.formData()).entries()) as Record<string, unknown>;
  } catch {
    return null;
  }
  return null;
}

export const wantsJson = (request: Request) => (request.headers.get('Accept') || '').includes('application/json');

/** Reject cross-site form posts. Same-origin fetches and direct navigations pass. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

export const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** ULID: time-sortable, 80 bits of randomness. */
export function ulid(now = Date.now()): string {
  let time = '';
  for (let i = 9, t = now; i >= 0; i--, t = Math.floor(t / 32)) time = ENCODING[t % 32] + time;
  const rand = crypto.getRandomValues(new Uint8Array(16));
  let r = '';
  for (const b of rand) r += ENCODING[b % 32];
  return time + r;
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
