import { defaultChatMatcherConfig } from "./config";
import { matchQuestion } from "./matcher";
import { normalizeText, tokenize } from "./normalize";
import { scoreEntry } from "./scoring";
import { filterStopwords, isStopword } from "./stopwords";
import { expandTokens } from "./synonyms";
import type {
  ChatEntryCandidate,
  ChatMatcherConfig,
  Clarifier,
  ClarifierSelection,
  ConversationInput,
  ConversationResult,
  RedFlagRule,
  ScoredEntry,
  SynonymRow,
} from "./types";

// A follow-up this short ("eh kung buntis siya?") cannot be matched on its
// own — it only means something against the previous turn. Above this it is
// treated as a fresh question, because a fully-formed question that happens
// to follow another one is a topic change more often than a refinement.
const MAX_FOLLOW_UP_CONTENT_TOKENS = 3;

// Whole-token phrase matching. Substring matching would fire "hilo" inside
// "nahihilo" and "hilot" alike; padding both sides with spaces means a phrase
// matches only as a complete word sequence, so the authored phrase lists say
// exactly what they mean and can be reviewed clinically rather than guessed at.
function containsPhrase(normalizedText: string, phrase: string): boolean {
  return ` ${normalizedText} `.includes(` ${phrase} `);
}

function containsAny(normalizedText: string, phrases: string[]): boolean {
  return phrases.some((phrase) => containsPhrase(normalizedText, phrase));
}

export function findRedFlag(normalizedText: string, rules: RedFlagRule[]): RedFlagRule | null {
  for (const rule of rules) {
    if (!containsAny(normalizedText, rule.any_of)) continue;
    if (rule.and_any_of && !containsAny(normalizedText, rule.and_any_of)) continue;
    return rule;
  }
  return null;
}

export function findClarifier(normalizedText: string, clarifiers: Clarifier[]): Clarifier | null {
  for (const clarifier of clarifiers) {
    if (!containsAny(normalizedText, clarifier.topic_any_of)) continue;
    if (!containsAny(normalizedText, clarifier.intent_any_of)) continue;
    if (clarifier.and_any_of && !containsAny(normalizedText, clarifier.and_any_of)) continue;
    if (clarifier.skip_if_any_of && containsAny(normalizedText, clarifier.skip_if_any_of)) continue;
    return clarifier;
  }
  return null;
}

// Forced routes still report the entry's real score rather than a synthetic
// 1.0, so match_score stays meaningful in the dashboard and a red flag that
// fires on a genuinely poor match is visible rather than disguised.
function scoreFor(
  normalizedText: string,
  entry: ChatEntryCandidate,
  synonyms: SynonymRow[],
  config: ChatMatcherConfig,
): ScoredEntry {
  const expandedTokens = filterStopwords(
    expandTokens(normalizedText, tokenize(normalizedText), synonyms),
  );
  return scoreEntry(normalizedText, expandedTokens, entry, config);
}

function contentTokenCount(normalizedText: string): number {
  return tokenize(normalizedText).filter((token) => !isStopword(token)).length;
}

export function resolveTurn(
  input: ConversationInput,
  entries: ChatEntryCandidate[],
  synonyms: SynonymRow[],
  redFlags: RedFlagRule[],
  clarifiers: Clarifier[],
  config: ChatMatcherConfig = defaultChatMatcherConfig,
): ConversationResult {
  // Keyed by content_id, NOT by the uuid primary key: rules live in versioned
  // content files and name entries like "m3-very-high-with-symptoms", while
  // `id` is a per-project uuid. Keying this on `id` makes every rule lookup
  // miss and silently turns the whole layer into a no-op.
  const byContentId = new Map(
    entries.filter((entry) => entry.content_id).map((entry) => [entry.content_id as string, entry]),
  );

  // 1. A clarifier selection resolves by entry id. It is a selection, not a
  // re-ask: re-scoring the option's canonical text could return a different
  // entry than the one the BHW tapped, which is the bug the old chip flow had.
  if (input.selection) {
    return resolveSelection(input.selection, byContentId, clarifiers, synonyms, config);
  }

  const question = (input.question ?? "").trim();
  if (question.length === 0) {
    return { type: "no_answer", route: "direct", normalizedText: "", resolvedQuery: "" };
  }

  const normalizedText = normalizeText(question);

  // 2. Red flags outrank everything, including a high-scoring wrong answer.
  const redFlag = findRedFlag(normalizedText, redFlags);
  if (redFlag) {
    const entry = byContentId.get(redFlag.entry_id);
    if (entry) {
      return {
        type: "answer",
        route: "red_flag",
        normalizedText,
        resolvedQuery: question,
        redFlagId: redFlag.id,
        top: scoreFor(normalizedText, entry, synonyms, config),
        related: [],
      };
    }
    // Entry unpublished or missing: fall through to scoring rather than
    // silently dropping the turn. Content validation should prevent this.
  }

  // 3. Ask the deeper question — but never twice in a row for the same
  // clarifier, or a BHW who rephrases instead of tapping an option loops.
  const clarifier = findClarifier(normalizedText, clarifiers);
  if (clarifier && input.context?.pendingClarifierId !== clarifier.id) {
    const options = clarifier.options.filter((option) => byContentId.has(option.entry_id));
    if (options.length >= 2) {
      return {
        type: "clarify",
        route: "clarify",
        normalizedText,
        resolvedQuery: question,
        clarifier: { ...clarifier, options },
      };
    }
  }

  // 4. Carry context for a short follow-up so "eh kung buntis siya?" is
  // matched against the previous topic instead of against nothing.
  const lastEntry = input.context?.lastContentId
    ? byContentId.get(input.context.lastContentId)
    : undefined;
  const isFollowUp =
    lastEntry !== undefined && contentTokenCount(normalizedText) <= MAX_FOLLOW_UP_CONTENT_TOKENS;

  const resolvedQuery = isFollowUp ? `${question} ${lastEntry.question_fil} ${lastEntry.question_en}` : question;

  const result = matchQuestion(resolvedQuery, entries, synonyms, config);
  const route = isFollowUp ? "context_carry" : "direct";

  if (result.type === "answer") {
    return { type: "answer", route, normalizedText, resolvedQuery, top: result.top, related: result.related };
  }
  if (result.type === "did_you_mean") {
    return { type: "did_you_mean", route, normalizedText, resolvedQuery, candidates: result.candidates };
  }
  return { type: "no_answer", route, normalizedText, resolvedQuery };
}

function resolveSelection(
  selection: ClarifierSelection,
  byContentId: Map<string, ChatEntryCandidate>,
  clarifiers: Clarifier[],
  synonyms: SynonymRow[],
  config: ChatMatcherConfig,
): ConversationResult {
  const clarifier = clarifiers.find((item) => item.id === selection.clarifierId);
  const option = clarifier?.options[selection.optionIndex];
  const entry = option ? byContentId.get(option.entry_id) : undefined;

  if (!clarifier || !option || !entry) {
    return { type: "invalid_selection", route: "selection", normalizedText: "", resolvedQuery: "" };
  }

  const normalizedText = normalizeText(option.label_en);
  return {
    type: "answer",
    route: "selection",
    normalizedText,
    resolvedQuery: option.label_en,
    clarifierId: clarifier.id,
    top: scoreFor(normalizedText, entry, synonyms, config),
    related: [],
  };
}
