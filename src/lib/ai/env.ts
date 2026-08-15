// Server-only provider credentials. Shaped after src/lib/supabase/env.ts, with
// one deliberate difference: these getters return null instead of throwing.
//
// The Supabase keys are required for the app to function at all, so a missing
// one should fail loudly. A provider key is optional by design —
// free-ai-leverage-plan.md rule 2 says the rule-based baseline must work with
// every AI provider gone, so "unconfigured" is a supported state, not an error.
// Same convention as sentry.server.config.ts's `enabled: Boolean(dsn)`.
//
// Literal property access rather than process.env[name] follows the house
// style. For NEXT_PUBLIC_* vars that is load-bearing (Next inlines them at
// build time); here it is only consistency, but the consistency is worth more
// than the flexibility.

export function getGeminiApiKey(): string | null {
  const value = process.env.GEMINI_API_KEY;
  return value && value.length > 0 ? value : null;
}

// The model is configuration, not code.
//
// INC-18a pinned "gemini-2.0-flash" as a literal. Google shut that model down
// on 2026-06-01, so the first time this feature was switched on in the pilot
// every request 404'd — and fixing a dead model meant a code change, a review
// and a deploy for what is a one-word setting. Providers retire models on
// their own schedule and always will, so the model name belongs in the
// environment where an operator can change it in a minute.
//
// The default tracks Google's own stated replacement for the retired model.
// It is a default, not a pin: set GEMINI_MODEL to override without a deploy.
export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

export function getGeminiModel(): string {
  const value = process.env.GEMINI_MODEL;
  return value && value.length > 0 ? value : DEFAULT_GEMINI_MODEL;
}
