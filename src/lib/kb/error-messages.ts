export type KbErrorKey =
  | "notAuthorizedError"
  | "ownerRequiredError"
  | "entryNotFoundError"
  | "articleNotFoundError"
  | "noEntriesSelectedError"
  | "bulkOwnerRequiredError"
  | "genericError";

// rpc_kb_* functions raise plain Postgres exceptions (same convention as
// src/lib/admin/error-messages.ts); match on the known message substrings
// so the console can show a localized, friendly message.
export function mapKbRpcError(message: string | undefined): KbErrorKey {
  if (!message) return "genericError";
  if (message.includes("not authorized")) return "notAuthorizedError";
  if (message.includes("no entries selected")) return "noEntriesSelectedError";
  if (message.includes("bulk: an owner is required")) return "bulkOwnerRequiredError";
  if (message.includes("owner is required")) return "ownerRequiredError";
  if (message.includes("entry not found")) return "entryNotFoundError";
  if (message.includes("article not found")) return "articleNotFoundError";
  return "genericError";
}
