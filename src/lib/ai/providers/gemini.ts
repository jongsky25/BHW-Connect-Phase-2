import { type ProviderTransport } from "../types";

// The only module in the codebase permitted to name a provider host. The
// eslint rules in eslint.config.mjs enforce that: a fetch() to this host
// anywhere else fails lint, and feature code cannot import this file at all.
//
// Kept as a literal rather than assembled from config, deliberately — a URL
// built from constants would defeat the lint rule that looks for the host.
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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
export const geminiTransport: ProviderTransport = async ({ apiKey, prompt, signal }) => {
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    signal,
  });

  if (!response.ok) {
    // The body may echo the prompt back in an error message, so it is
    // deliberately not included here — this string reaches Sentry.
    throw new Error(`gemini responded ${response.status}`);
  }

  const body = (await response.json()) as GeminiResponse;
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("gemini returned no candidate text");
  }

  return text;
};
