// INC-18a. Types for the AI provider adapter and its data-classification gate.
// See docs/free-ai-leverage-plan.md §2 — this module exists to make rule 4
// ("no personal or user-generated data ever reaches an external AI provider —
// guaranteed by architecture, not by policy") mechanically true.

// The five classifications from the plan's allowlist table. Every payload
// carries one; there is no untyped path into the adapter.
export type DataClassification =
  | "public_content" // published KB entries, categories
  | "admin_authored" // draft KB text, announcement drafts
  | "admin_cleared" // an unmatched question an admin read, redacted, and sent
  | "user_generated" // chat questions, survey answers, forum posts
  | "personal"; // profiles, credentials, audit rows

// Tier B = external providers. Only these three may ever leave our
// infrastructure. The list is deliberately written as an allowlist, not as a
// denylist of the other two: a classification added later is rejected until
// someone explicitly decides otherwise.
export const TIER_B_PERMITTED: readonly DataClassification[] = [
  "public_content",
  "admin_authored",
  "admin_cleared",
];

export type ProviderId = "gemini";

// The features permitted to make external calls, so a usage row says what the
// quota was spent on rather than just that it was spent.
export type AiFeature =
  | "gap_draft"
  | "gap_summary"
  | "synonym_suggest"
  | "translation_draft";

export type AiPayload = {
  classification: DataClassification;
  prompt: string;
};

// Why a call did not happen. All of these are *values*, not exceptions:
// free-ai-leverage-plan.md:9 requires degrading silently to the rule-based
// baseline rather than erroring at the user. A classification breach is the
// one case that throws instead — see DataClassificationError.
export type AiUnavailableReason =
  | "flag_disabled" // ai_external is off
  | "no_api_key" // provider not configured — the app runs fine unconfigured
  | "over_ceiling" // budget guard tripped, or breaker open
  | "timeout"
  | "provider_error";

export type AiResult =
  | { ok: true; text: string; provider: ProviderId }
  | { ok: false; reason: AiUnavailableReason };

// A gate breach is a programming error, not a runtime condition, so it throws
// and gets captured by Sentry via instrumentation.ts's onRequestError. It must
// be loud: it means a code path tried to send data the DPA guarantee says can
// never leave.
export class DataClassificationError extends Error {
  constructor(readonly classification: DataClassification) {
    super(`classification "${classification}" may not be sent to an external AI provider`);
    this.name = "DataClassificationError";
  }
}

// Injected rather than imported, matching getFeatureFlags(supabase) and
// getAppUser(supabase, id). It is also what lets the gate test assert the
// transport was never called at all, which is a stronger guarantee than
// asserting that an error was thrown.
export type ProviderTransport = (input: {
  apiKey: string;
  prompt: string;
  signal: AbortSignal;
}) => Promise<string>;

export type BudgetDecision = { allowed: boolean };

// What §2 requires recording per external call: provider, feature,
// classification and a content hash. Never the content itself.
export type CallRecord = {
  provider: ProviderId;
  feature: AiFeature;
  classification: DataClassification;
  contentHash: string;
};

export type AdapterDeps = {
  transport: ProviderTransport;
  apiKey: string | null;
  externalAiEnabled: boolean;
  checkBudget?: () => Promise<BudgetDecision>;
  recordCall?: (record: CallRecord) => Promise<void>;
  // Extra names to scrub, drawn from the users table by the caller. The
  // adapter never queries anything itself.
  redactNames?: string[];
};
