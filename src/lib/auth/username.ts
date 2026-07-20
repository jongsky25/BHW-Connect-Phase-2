// Login is username+password (delivery-plan.md §4); Supabase Auth still
// requires an email internally, so one is synthesized and never shown to
// the user. Usernames are treated case-insensitively.
const SYNTHESIZED_EMAIL_DOMAIN = "bhw.local";

export function usernameToSynthesizedEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${SYNTHESIZED_EMAIL_DOMAIN}`;
}

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/i;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username.trim());
}
