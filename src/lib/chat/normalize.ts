// §6.1 step 1: lowercase, strip punctuation, collapse whitespace. Unicode
// letter/number classes so Filipino diacritics survive the strip.
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(normalized: string): string[] {
  return normalized.length === 0 ? [] : normalized.split(" ");
}
