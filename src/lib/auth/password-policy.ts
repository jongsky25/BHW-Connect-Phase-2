import fs from "node:fs";
import path from "node:path";

// NIST SP 800-63B guidance (delivery-plan.md §5.1): length over composition
// rules — min 8 chars, no forced symbols/rotation, blocked if it's one of
// the ~10k most commonly used passwords. Server-only (reads a 72 KB
// wordlist off disk) — never import this from a client component.

export const MIN_PASSWORD_LENGTH = 8;

let commonPasswords: Set<string> | undefined;

function loadCommonPasswords(): Set<string> {
  if (!commonPasswords) {
    const filePath = path.join(process.cwd(), "src/lib/auth/common-passwords.txt");
    const contents = fs.readFileSync(filePath, "utf-8");
    commonPasswords = new Set(
      contents
        .split("\n")
        .map((line) => line.trim().toLowerCase())
        .filter(Boolean),
    );
  }
  return commonPasswords;
}

export type PasswordValidationError = "too_short" | "too_common";

export interface PasswordValidationResult {
  valid: boolean;
  errors: PasswordValidationError[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: PasswordValidationError[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push("too_short");
  }

  if (loadCommonPasswords().has(password.toLowerCase())) {
    errors.push("too_common");
  }

  return { valid: errors.length === 0, errors };
}
