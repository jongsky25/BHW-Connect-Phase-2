import type { ChatMatcherConfig } from "./types";

// §6.1 step 3-4: weights and thresholds, admin-tunable later — kept as a
// single config object so a future admin UI has one place to change.
export const defaultChatMatcherConfig: ChatMatcherConfig = {
  weights: { textOverlap: 0.5, trigram: 0.3, keyword: 0.2 },
  thresholds: { answer: 0.55, didYouMean: 0.35 },
};
