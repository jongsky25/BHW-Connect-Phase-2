import type { SupabaseClient } from "@supabase/supabase-js";
import { callProvider } from "./adapter";
import { providerCeilings } from "./config";
import { getGeminiApiKey } from "./env";
import { geminiTransport } from "./providers/gemini";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import type { AiFeature, AiPayload, AiResult } from "./types";

// The composition root for external AI calls, and the only module that wires a
// transport to the adapter. INC-18a built `callProvider` taking every
// dependency by injection, which left `geminiTransport` imported by nothing —
// this file closes that gap.
//
// The split is deliberate and is what makes the DPA guarantee auditable:
// adapter.ts holds the *policy* (the classification gate, the check order, the
// redaction, the timeout) and touches no I/O, so it can be read and tested in
// isolation. This file holds the *composition* — environment, Supabase, the
// provider — and holds no policy of its own. eslint.config.mjs lists exactly
// one exception to the "feature code may not import a transport" rule, and it
// is this file.

const PROVIDER = "gemini" as const;

// Redaction dictionary size. The users table is the source
// (free-ai-leverage-plan.md §2, "users-table dictionary sweep"), but the sweep
// is defence in depth behind a human clearance step, not the primary control,
// so it is bounded: on a large deployment an unbounded fetch would put every
// staff name into memory and every name into a regex on each call, for a
// second net that is already backed by the classification gate.
const REDACT_DICTIONARY_LIMIT = 500;

async function loadRedactNames(supabase: SupabaseClient): Promise<string[]> {
  // RLS decides what is visible here; an admin sees their org subtree, which
  // is the set of names plausibly appearing in a question from their BHWs.
  const { data, error } = await supabase
    .from("users")
    .select("full_name")
    .limit(REDACT_DICTIONARY_LIMIT);

  if (error) {
    // Never fatal. The dictionary is the weakest of three controls (gate,
    // human clearance, sweep) and the pattern-based redaction in redact()
    // runs regardless, so a failed read degrades the net rather than the call.
    console.error("loadRedactNames: failed to load the redaction dictionary", error);
    return [];
  }

  return (data ?? [])
    .map((row) => (row as { full_name: string | null }).full_name)
    .filter((name): name is string => typeof name === "string");
}

/**
 * Make an external AI call with every guard wired in.
 *
 * Feature code calls this, never `callProvider` directly and never a transport.
 * Returns `AiResult`, so an unconfigured key, a tripped ceiling or a provider
 * outage all arrive as values the caller must handle — the rule-based baseline
 * stays the answer in each of those states.
 *
 * Throws only on `DataClassificationError`, which is a caller bug rather than a
 * runtime condition and is meant to reach Sentry.
 */
export async function runAiCall(
  supabase: SupabaseClient,
  payload: AiPayload,
  feature: AiFeature,
): Promise<AiResult> {
  const flags = await getFeatureFlags(supabase);
  const apiKey = getGeminiApiKey();

  // Assembled lazily where possible: with the flag off or no key configured,
  // the adapter returns before `checkBudget` is reached, so no counter is
  // spent and no dictionary is read for a call that will not happen. The one
  // exception is the dictionary itself, which the adapter needs up front —
  // hence the early return below rather than an unconditional fetch.
  if (!flags.ai_external || !apiKey) {
    return callProvider(payload, feature, {
      transport: geminiTransport,
      apiKey,
      externalAiEnabled: flags.ai_external,
    });
  }

  const ceilings = providerCeilings[PROVIDER];

  return callProvider(payload, feature, {
    transport: geminiTransport,
    apiKey,
    externalAiEnabled: true,
    redactNames: await loadRedactNames(supabase),
    checkBudget: async () => {
      // rpc_ai_check_budget counts the request and then decides, so it must
      // only be called for a request that is actually about to be made. The
      // ceilings are passed in from config.ts rather than stored in the
      // database so the guard and the admin panel cannot disagree.
      const { data, error } = await supabase
        .rpc("rpc_ai_check_budget", {
          p_provider: PROVIDER,
          p_feature: feature,
          p_daily_ceiling: ceilings.perDay,
          p_weekly_ceiling: ceilings.perWeek,
        })
        .single<{ allowed: boolean }>();

      // Fail closed. If the guard cannot be consulted, the ceiling cannot be
      // honoured, and overrunning a free tier is the one failure the plan
      // treats as unacceptable.
      if (error || !data) {
        console.error("runAiCall: budget check failed, refusing the call", error);
        return { allowed: false };
      }

      return { allowed: data.allowed };
    },
    recordCall: async (record) => {
      const { error } = await supabase.rpc("rpc_ai_record_call", {
        p_provider: record.provider,
        p_feature: record.feature,
        p_classification: record.classification,
        p_content_hash: record.contentHash,
      });

      // The call already happened; failing to record it must not turn a
      // successful draft into an error at the admin. Loud in Sentry, silent
      // to the user.
      if (error) {
        console.error("runAiCall: failed to record the external call", error);
      }
    },
  });
}
