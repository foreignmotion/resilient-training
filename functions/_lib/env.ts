export interface Env {
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  RESEND_API_KEY?: string;
  /** Google Apps Script web app on the signup sheet (registrations + email list tabs). */
  SHEET_WEBHOOK_URL?: string;
  SHEET_WEBHOOK_SECRET?: string;
  /** Cloudflare Access: team domain (e.g. "myteam.cloudflareaccess.com") and application AUD tag for /admin. */
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
}

export type Fn = PagesFunction<Env>;
