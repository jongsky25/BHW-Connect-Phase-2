// Defence in depth, not the primary control (free-ai-leverage-plan.md §2:
// "a second net under the human judgment, never a substitute for it"). The
// classification gate is what actually enforces the DPA guarantee; this runs
// on text that has already been cleared by a human, to catch what they missed.
//
// Ordering matters: emails are matched before phone numbers, because a digit
// run inside an address would otherwise be partially rewritten and leave a
// mangled fragment behind rather than a clean placeholder.

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;

// Philippine mobile numbers: 09XXXXXXXXX, +639XXXXXXXXX, 639XXXXXXXXX, with
// optional spaces or dashes as grouping.
const PH_MOBILE = /(?:\+?63|0)[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{4}/g;

// Landlines: (02) 8123-4567 and the like. Kept separate from mobile so each
// pattern stays readable and independently testable.
const PH_LANDLINE = /\(?0\d{1,2}\)?[\s-]?\d{3,4}[\s-]?\d{4}/g;

export const REDACTED = "[naalis]";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Scrub obvious personal identifiers from text bound for an external provider.
 *
 * `names` is supplied by the caller from the users table — the plan calls this
 * the "users-table dictionary sweep". The adapter never queries anything
 * itself, so this stays a pure function and stays testable.
 */
export function redact(text: string, names: string[] = []): string {
  let output = text.replace(EMAIL, REDACTED).replace(PH_MOBILE, REDACTED).replace(PH_LANDLINE, REDACTED);

  // Longest first, so "Maria Santos" is replaced whole rather than leaving
  // "[naalis] Santos" behind when "Maria" also appears in the dictionary.
  const sorted = [...names]
    .map((name) => name.trim())
    .filter((name) => name.length > 2)
    .sort((a, b) => b.length - a.length);

  for (const name of sorted) {
    output = output.replace(new RegExp(escapeRegExp(name), "gi"), REDACTED);
  }

  return output;
}

/**
 * Stable content hash for the audit trail. §2 requires recording "provider,
 * feature, classification, and a content hash" — the hash exists so an
 * exchange can be proven after the fact without ever storing what was sent.
 *
 * FNV-1a: not cryptographic, and does not need to be. It identifies a payload
 * for accountability; it is not a secret and guards nothing.
 */
export function contentHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
