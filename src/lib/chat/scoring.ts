import { normalizeText, tokenize } from "./normalize";
import { trigramSimilarity } from "./similarity";
import { filterStopwords } from "./stopwords";
import type { ChatEntryCandidate, ChatMatcherConfig, ScoredEntry } from "./types";

// Two tokens "match" if identical, or — long enough to be meaningful —
// one contains the other. This absorbs English inflection (vaccine /
// vaccines) and Filipino affixation (bakuna / magpabakuna, tae /
// nagtatae) without a full stemmer; exact typo tolerance is handled
// separately by trigram similarity.
const MIN_FUZZY_MATCH_LENGTH = 5;

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= MIN_FUZZY_MATCH_LENGTH && b.length >= MIN_FUZZY_MATCH_LENGTH) {
    return a.includes(b) || b.includes(a);
  }
  return false;
}

// Distinct query concepts matched — counted from the query side and
// deduped so a single query word doesn't get credit twice just because
// the entry's own text happens to contain two forms of it (e.g. a query
// for "child" shouldn't score higher for an entry that says both "child"
// and "children").
function countMatches(queryTokens: string[], targetTokens: string[]): number {
  const targets = new Set(targetTokens);
  let count = 0;
  for (const q of new Set(queryTokens)) {
    if (Array.from(targets).some((t) => tokensMatch(q, t))) count++;
  }
  return count;
}

// A couple of strong signals should be enough to be confident — a chat
// question is short, so both scores cap at 1 once 2 distinct terms have
// matched rather than dividing by the full token count.
function cappedRatio(matched: number, cap: number): number {
  return Math.min(1, matched / Math.max(1, cap));
}

function textOverlapScore(expandedTokens: string[], entryTokens: string[]): number {
  if (expandedTokens.length === 0 || entryTokens.length === 0) return 0;
  return cappedRatio(countMatches(expandedTokens, entryTokens), 2);
}

function keywordOverlapScore(expandedTokens: string[], keywords: string[]): number {
  if (keywords.length === 0) return 0;
  return cappedRatio(countMatches(expandedTokens, keywords.map((k) => normalizeText(k))), 2);
}

// Trigram similarity runs over stopword-filtered content words rather than
// the raw sentence: shared function words ("ang", "ng", "sa", "is", "the")
// otherwise inflate the similarity of two topically unrelated questions.
function contentText(text: string): string {
  return filterStopwords(tokenize(normalizeText(text))).join(" ");
}

// §6.1 step 3: 0.5 x full-text overlap + 0.3 x trigram similarity + 0.2 x
// keyword-overlap ratio. Weights configurable via ChatMatcherConfig.
export function scoreEntry(
  normalizedQuery: string,
  expandedTokens: string[],
  entry: ChatEntryCandidate,
  config: ChatMatcherConfig,
): ScoredEntry {
  const entryText = normalizeText(
    `${entry.question_fil} ${entry.question_en} ${entry.keywords.join(" ")}`,
  );
  const entryTokens = tokenize(entryText);
  const queryContentText = filterStopwords(tokenize(normalizedQuery)).join(" ");

  const textOverlap = textOverlapScore(expandedTokens, entryTokens);
  const trigram = Math.max(
    trigramSimilarity(queryContentText, contentText(entry.question_fil)),
    trigramSimilarity(queryContentText, contentText(entry.question_en)),
  );
  const keyword = keywordOverlapScore(expandedTokens, entry.keywords);

  const totalScore =
    config.weights.textOverlap * textOverlap +
    config.weights.trigram * trigram +
    config.weights.keyword * keyword;

  return {
    entry,
    textOverlapScore: textOverlap,
    trigramScore: trigram,
    keywordScore: keyword,
    totalScore,
  };
}
