import { isCommonPassword } from "./common-passwords";

export type PasswordPolicyError = "tooShort" | "tooCommon";

// NIST SP 800-63B: length over composition rules, no forced rotation
// (delivery-plan.md §5.1). No symbol/number/rotation requirements.
const MIN_LENGTH = 8;

export function validatePassword(password: string): PasswordPolicyError | null {
  if (password.length < MIN_LENGTH) {
    return "tooShort";
  }
  if (isCommonPassword(password)) {
    return "tooCommon";
  }
  return null;
}
