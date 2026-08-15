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
