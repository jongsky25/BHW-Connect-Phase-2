export type KbErrorKey =
  | "notAuthorizedError"
  | "ownerRequiredError"
  | "entryNotFoundError"
  | "articleNotFoundError"
  | "genericError";

// rpc_kb_* functions raise plain Postgres exceptions (same convention as
// src/lib/admin/error-messages.ts); match on the known message substrings
// so the console can show a localized, friendly message.
export function mapKbRpcError(message: string | undefined): KbErrorKey {
  if (!message) return "genericError";
  if (message.includes("not authorized")) return "notAuthorizedError";
  if (message.includes("owner is required")) return "ownerRequiredError";
  if (message.includes("entry not found")) return "entryNotFoundError";
  if (message.includes("article not found")) return "articleNotFoundError";
  return "genericError";
}
