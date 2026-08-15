export type ChatEntryCandidate = {
  // Database primary key (uuid). This is what the API returns to the client
  // and what chat_messages.matched_entry_id references.
  id: string;
  // Stable id from the versioned content files ("m3-very-high-with-symptoms"),
  // null for entries authored by hand in the admin console. Red-flag and
  // clarifier rules are written against *this*, never against `id` — the uuid
  // differs per Supabase project, so a rule keyed on it could never fire.
  content_id: string | null;
  question_fil: string;
  question_en: string;
  answer_fil: string;
  answer_en: string;
  keywords: string[];
};

export type SynonymRow = {
  term: string;
  maps_to: string;
  language: "fil" | "en" | "taglish";
};

export type ChatMatcherConfig = {
  weights: { textOverlap: number; trigram: number; keyword: number };
  thresholds: { answer: number; didYouMean: number };
};

export type ScoredEntry = {
  entry: ChatEntryCandidate;
  textOverlapScore: number;
  trigramScore: number;
  keywordScore: number;
  totalScore: number;
};

export type ChatMatchResult =
  | { type: "answer"; normalizedText: string; top: ScoredEntry; related: ScoredEntry[] }
  | { type: "did_you_mean"; normalizedText: string; candidates: ScoredEntry[] }
  | { type: "no_answer"; normalizedText: string };

// --- Conversation layer (INC-17) -------------------------------------------
// Authored content, loaded from content/kb/hhp-ncd/{red-flags,clarifiers}.json
// and validated by scripts/lib/kb-content.mjs. Nothing here is generated.

export type RedFlagRule = {
  id: string;
  entry_id: string;
  rationale: string;
  any_of: string[];
  and_any_of?: string[];
};

export type ClarifierOption = {
  label_en: string;
  label_fil: string;
  entry_id: string;
};

export type Clarifier = {
  id: string;
  question_en: string;
  question_fil: string;
  topic_any_of: string[];
  intent_any_of: string[];
  and_any_of?: string[];
  skip_if_any_of?: string[];
  options: ClarifierOption[];
};

// Rolling per-session state, persisted on chat_sessions.context. Deliberately
// tiny: the last answered entry (for follow-up carry) and the clarifier still
// awaiting a reply (so we never ask the same one twice in a row).
export type ChatContext = {
  // Content id (not the uuid) of the last answered entry, so follow-up carry
  // survives a reload into a differently-keyed project.
  lastContentId?: string | null;
  pendingClarifierId?: string | null;
};

export type ClarifierSelection = {
  clarifierId: string;
  optionIndex: number;
};

export type ConversationInput = {
  question?: string;
  selection?: ClarifierSelection;
  context?: ChatContext | null;
};

// How this turn was decided — persisted so the dashboard can distinguish a
// red-flag interception from an ordinary high-scoring match.
export type ConversationRoute =
  | "direct"
  | "red_flag"
  | "clarify"
  | "selection"
  | "context_carry";

type ConversationBase = {
  route: ConversationRoute;
  normalizedText: string;
  resolvedQuery: string;
};

export type ConversationResult =
  | (ConversationBase & {
      type: "answer";
      top: ScoredEntry;
      related: ScoredEntry[];
      redFlagId?: string;
      clarifierId?: string;
    })
  | (ConversationBase & { type: "did_you_mean"; candidates: ScoredEntry[] })
  | (ConversationBase & { type: "clarify"; clarifier: Clarifier })
  | (ConversationBase & { type: "no_answer" })
  | (ConversationBase & { type: "invalid_selection" });
