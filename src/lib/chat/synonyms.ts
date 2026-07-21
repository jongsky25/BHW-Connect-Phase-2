import { normalizeText } from "./normalize";
import type { SynonymRow } from "./types";

// §6.1 step 2: union the normalized tokens with their synonym mappings,
// both directions, both languages. A synonym's term/maps_to may each be a
// single word ("bkit" -> "bakit") or a phrase ("lagnat ng baby" -> "lagnat
// sanggol fever infant") — phrases match against the normalized text as a
// substring since word order/adjacency carries meaning; single words match
// against the token set.
export function expandTokens(
  normalizedText: string,
  tokens: string[],
  synonyms: SynonymRow[],
): string[] {
  const tokenSet = new Set(tokens);
  const expanded = new Set(tokens);

  for (const { term, maps_to } of synonyms) {
    const from = normalizeText(term);
    const to = normalizeText(maps_to);
    if (!from || !to) continue;

    const fromMatches = from.includes(" ") ? normalizedText.includes(from) : tokenSet.has(from);
    if (fromMatches) {
      for (const t of to.split(" ")) expanded.add(t);
    }

    const toMatches = to.includes(" ") ? normalizedText.includes(to) : tokenSet.has(to);
    if (toMatches) {
      for (const t of from.split(" ")) expanded.add(t);
    }
  }

  return Array.from(expanded);
}
