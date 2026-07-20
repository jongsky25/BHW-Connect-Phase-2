import commonPasswords from "./common-passwords.json";

// NIST SP 800-63B (delivery-plan.md §5.1): length over composition rules.
// No forced symbols/uppercase/digits, no forced rotation.
export const MIN_PASSWORD_LENGTH = 8;

// Passwords >= 8 chars from the top 10,000 most-common-passwords list
// (SecLists, danielmiessler/SecLists, 10k-most-common.txt) — shorter
// entries are dropped since MIN_PASSWORD_LENGTH already rejects them.
const commonPasswordSet = new Set(commonPasswords as string[]);

export type PasswordValidationError = "too_short" | "too_common";

export function validatePassword(password: string): PasswordValidationError | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return "too_short";
  }
  if (commonPasswordSet.has(password.toLowerCase())) {
    return "too_common";
  }
  return null;
}
