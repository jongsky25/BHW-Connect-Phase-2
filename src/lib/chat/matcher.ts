import { defaultChatMatcherConfig } from "./config";
import { normalizeText, tokenize } from "./normalize";
import { scoreEntry } from "./scoring";
import { filterStopwords } from "./stopwords";
import { expandTokens } from "./synonyms";
import type { ChatEntryCandidate, ChatMatchResult, ChatMatcherConfig, SynonymRow } from "./types";

// §6.1 step 4: score >= 0.55 -> top entry as the answer, next 2 as
// "related"; 0.35-0.55 -> "did you mean" list of top 3; < 0.35 ->
// no-answer (caller upserts unmatched_questions).
export function matchQuestion(
  question: string,
  entries: ChatEntryCandidate[],
  synonyms: SynonymRow[],
  config: ChatMatcherConfig = defaultChatMatcherConfig,
): ChatMatchResult {
  const normalizedText = normalizeText(question);
  const tokens = tokenize(normalizedText);
  const expandedTokens = filterStopwords(expandTokens(normalizedText, tokens, synonyms));

  const scored = entries
    .map((entry) => scoreEntry(normalizedText, expandedTokens, entry, config))
    .sort((a, b) => b.totalScore - a.totalScore);

  const top = scored[0];

  if (top && top.totalScore >= config.thresholds.answer) {
    return { type: "answer", normalizedText, top, related: scored.slice(1, 3) };
  }

  if (top && top.totalScore >= config.thresholds.didYouMean) {
    return { type: "did_you_mean", normalizedText, candidates: scored.slice(0, 3) };
  }

  return { type: "no_answer", normalizedText };
}
