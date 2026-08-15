import type { ProviderId } from "./types";

// Ceilings and timeouts, kept in one object so a future admin UI has one place
// to change — same reasoning as src/lib/chat/config.ts.
//
// free-ai-leverage-plan.md §2: "Configured ceilings per provider at 80% of the
// published free limit (headroom for drift and retries)". Gemini's published
// Flash-class free tier is ~1,500 requests/day (plan §1, verified 2026-07-18),
// so the daily ceiling is 1,200. The weekly ceiling is the same figure over
// seven days, which is a deliberate belt-and-braces bound rather than a
// provider-published one — a single runaway day cannot exhaust the week.
export type ProviderCeilings = { perDay: number; perWeek: number };

export const providerCeilings: Record<ProviderId, ProviderCeilings> = {
  gemini: { perDay: 1_200, perWeek: 8_400 },
};

// Well under Vercel's serverless function limit. scripts/kb-check-sources.mjs
// uses 30s, but that is a Node script with no platform ceiling above it; a
// request handler that outruns the platform is killed with no chance to
// degrade gracefully, which is the one outcome the plan forbids.
export const AI_REQUEST_TIMEOUT_MS = 20_000;

// Published free-tier limits, recorded so the ceiling above can be checked
// against them when they drift. Free tiers change without notice
// (free-ai-leverage-plan.md §5), so this is documentation, not configuration.
export const publishedFreeLimits: Record<ProviderId, { perDay: number; note: string }> = {
  gemini: {
    perDay: 1_500,
    note: "Flash / Flash-Lite class, verified 2026-07-18. Free-tier data may be used for training — Tier B rules apply strictly. The pilot's key is on a paid tier, where that training clause does not apply and the real limit is higher; the ceiling above is therefore a spend guard rather than a free-tier bound, and is deliberately left where it is until someone decides what this deployment should be allowed to spend.",
  },
};

// The model is NOT configured here. It lives in the environment
// (src/lib/ai/env.ts, GEMINI_MODEL) so that a provider retiring a model — which
// they do on their own schedule, and which happened to this project on
// 2026-06-01 — is an operator action rather than a code change and a deploy.
