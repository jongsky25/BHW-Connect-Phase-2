import { getGeminiModel } from "../env";
import { type ProviderTransport } from "../types";

// The only module in the codebase permitted to name a provider host. The
// eslint rules in eslint.config.mjs enforce that: a fetch() to this host
// anywhere else fails lint, and feature code cannot import this file at all.
//
// Kept as a literal rather than assembled from config, deliberately — a URL
// built from constants would defeat the lint rule that looks for the host.
// The *model* is not part of that constraint and is read from the environment
// (see getGeminiModel): the host is a security boundary, the model is a
// setting, and conflating the two is what made a routine model retirement
// require a deploy.
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

/**
 * Transport only: no gate, no budget, no redaction. Those all live in
 * adapter.ts, which is the sole caller. Splitting them this way is what makes
 * "there is no code path that sends forbidden data" checkable by reading one
 * function rather than auditing every call site.
 *
 * Throws on transport failure; the adapter converts that to a value.
 */
export const geminiTransport: ProviderTransport = async ({ apiKey, prompt, signal, jsonSchema }) => {
  const model = getGeminiModel();
  const response = await fetch(
    `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // Gemini enforces the shape server-side when a schema is supplied, which
        // is why the caller gets to skip prose-scraping entirely. Omitted
        // entirely when absent so free-text callers are unaffected.
        ...(jsonSchema
          ? { generationConfig: { responseMimeType: "application/json", responseSchema: jsonSchema } }
          : {}),
      }),
      signal,
    },
  );

  if (!response.ok) {
    // The status alone is not enough to act on: a retired model, a rejected
    // response schema and a bad key are all 4xx, and telling them apart took a
    // database query and a web search the first time this happened.
    //
    // Only Google's structured `error.status` and `error.message` are read —
    // never the raw body. This string reaches Sentry and
    // sentry.server.config.ts has no beforeSend scrubber, so what goes in it
    // has to be chosen rather than truncated: a slice of an arbitrary body is
    // a slice of whatever the provider decided to quote back.
    let detail = "";
    try {
      const body = (await response.json()) as {
        error?: { status?: unknown; message?: unknown };
      };
      const parts = [body.error?.status, body.error?.message]
        .filter((part): part is string => typeof part === "string")
        .map((part) => part.slice(0, 200));
      detail = parts.join(" — ");
    } catch {
      // A body that is absent or not JSON is not worth failing differently over.
    }
    throw new Error(`gemini responded ${response.status} for model "${model}"${detail ? `: ${detail}` : ""}`);
  }

  const body = (await response.json()) as GeminiResponse;
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error(`gemini returned no candidate text for model "${model}"`);
  }

  return text;
};
