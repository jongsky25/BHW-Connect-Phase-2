export type ChatEntryCandidate = {
  id: string;
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
