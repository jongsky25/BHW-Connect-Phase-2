// BHWs log in with a username, but Supabase Auth needs an email. We
// synthesize one internally and never show it in the UI (delivery-plan.md
// §4). `.local` is a reserved, non-routable TLD, so these addresses can
// never collide with a real inbox.

export const AUTH_EMAIL_DOMAIN = "bhw.local";

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(username));
}

export function toAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}
