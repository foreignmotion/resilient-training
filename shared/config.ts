/**
 * Site configuration. Every page, server function and email reads from here.
 * Change a value once and it updates everywhere.
 *
 * Secrets (Stripe, Resend, Google Sheet webhook) are NOT here; they live in
 * Cloudflare environment variables. See README.md.
 */
export const site = {
  /** D1: organization name. */
  orgName: 'Resilient Skills',
  /** Line set under the name in the home-page headline. */
  orgSubhead: 'Training Co',
  /** D1: production origin, used for Stripe return URLs, canonical links and emails. No trailing slash. */
  url: 'https://buildresilientskills.com',
  /** D2: public contact email. */
  email: 'jether@buildresilientskills.com',
  /** Where owner notifications and NCRT interest messages go. Defaults to the public email. */
  ownerEmail: 'jether@buildresilientskills.com',
  /** Optional NCRT contact copied on NCRT interest messages. */
  ncrtEmail: '',
  /** "From" address for transactional email; must be on a domain verified in Resend. */
  fromEmail: 'Resilient Skills <jether@buildresilientskills.com>',
  region: 'Middle Tennessee',
} as const;

export const course = {
  name: 'Wilderness Survival Fundamentals',
  /** D3: price per student in cents. 0 shows "[Price]" and blocks checkout. */
  priceCents: 3000,
  currency: 'usd',
  timeLabel: '1:00–4:00 PM',
  /** Class weekday, 0 = Sunday. */
  weekday: 3,
  /** How many upcoming class dates to offer. */
  datesShown: 6,
  /** D12: same-day registration closes at this local time (America/Chicago), 24h "HH:MM". */
  sameDayCutoff: '10:00',
  /** D13: ISO dates with no class, e.g. ['2026-11-25', '2026-12-23']. */
  blackoutDates: [] as string[],
  timeZone: 'America/Chicago',
} as const;

export const legal = {
  /** Bump when content/waiver.md changes. Each version is stored forever with its hash. */
  waiverVersion: '2026-10-06',
} as const;

/** Optional home-page class photo (fire, water or shelter). Drop a file in src/assets/images and set its name. */
export const homeClassPhoto: { file: string; alt: string } | null = {
  file: 'image03_river-ropes-dusk.jpg',
  alt: 'Two people on ropes under a bridge at dusk, headlamps on',
};

export const hasPrice = () => course.priceCents > 0;

export function formatMoney(cents: number): string {
  const dollars = cents / 100;
  return '$' + (Number.isInteger(dollars) ? dollars.toString() : dollars.toFixed(2));
}

export function priceLabel(): string {
  return hasPrice() ? formatMoney(course.priceCents) : '[Price]';
}

export function mailtoHref(): string {
  return site.email.includes('@') ? `mailto:${site.email}` : 'mailto:';
}

/** Replace the copy placeholders used in content/*.md. */
export function fillPlaceholders(text: string): string {
  return text
    .replaceAll('[Organization name]', site.orgName)
    .replaceAll('[Email address]', site.email)
    .replaceAll('[Price]', priceLabel());
}
