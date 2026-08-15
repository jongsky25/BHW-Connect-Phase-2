import { isTierBPermitted } from "./classification";
import { AI_REQUEST_TIMEOUT_MS } from "./config";
import { contentHash, redact } from "./redact";
import {
  DataClassificationError,
  type AdapterDeps,
  type AiFeature,
  type AiPayload,
  type AiResult,
  type ProviderId,
} from "./types";

const PROVIDER: ProviderId = "gemini";

/**
 * The single entry point for every external AI call.
 *
 * free-ai-leverage-plan.md §2: "No direct provider calls from feature code."
 * The eslint rules in eslint.config.mjs enforce that structurally; this
 * function is what feature code calls instead.
 *
 * Check order is deliberate. The classification gate runs **first**, before
 * the flag, the key, or the budget — so a forbidden payload throws even when
 * the feature is switched off and no provider is configured. That makes the
 * guarantee unconditional: there is no state of the system in which
 * user_generated or personal data reaches the transport.
 */
export async function callProvider(
  payload: AiPayload,
  feature: AiFeature,
  deps: AdapterDeps,
): Promise<AiResult> {
  // 1. The gate. Throws rather than returning, because reaching here with a
  // forbidden classification is a bug in the caller, not a runtime condition —
  // it should be loud and land in Sentry via onRequestError.
  if (!isTierBPermitted(payload.classification)) {
    throw new DataClassificationError(payload.classification);
  }

  // 2-3. Not configured is a supported state, never an error (rule 2: if every
  // provider vanished tomorrow the app still functions fully).
  if (!deps.externalAiEnabled) {
    return { ok: false, reason: "flag_disabled" };
  }
  if (!deps.apiKey) {
    return { ok: false, reason: "no_api_key" };
  }

  // 4. Ceiling and circuit breaker. Degrades silently to the caller's baseline.
  if (deps.checkBudget) {
    const decision = await deps.checkBudget();
    if (!decision.allowed) {
      return { ok: false, reason: "over_ceiling" };
    }
  }

  // 5. Second net under the human clearance step.
  const prompt = redact(payload.prompt, deps.redactNames ?? []);

  // 6. Transport, with a hard timeout. Errors become values, following
  // scripts/kb-check-sources.mjs — the repo's only existing timeout.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  let text: string;
  try {
    text = await deps.transport({
      apiKey: deps.apiKey,
      prompt,
      signal: controller.signal,
      jsonSchema: payload.jsonSchema,
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return { ok: false, reason: aborted ? "timeout" : "provider_error" };
  } finally {
    clearTimeout(timer);
  }

  // 7. Accountability trail. The hash is of the redacted text — what actually
  // left the system. Never the text itself: sentry.server.config.ts has no
  // beforeSend scrubber, and audit rows are readable by admins.
  if (deps.recordCall) {
    await deps.recordCall({
      provider: PROVIDER,
      feature,
      classification: payload.classification,
      contentHash: contentHash(prompt),
    });
  }

  return { ok: true, text, provider: PROVIDER };
}
