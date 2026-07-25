export type ForumErrorKey =
  | "notAuthorizedError"
  | "slugAndNameRequiredError"
  | "categoryNotFoundError"
  | "categoryHasThreadsError"
  | "titleAndBodyRequiredError"
  | "bodyRequiredError"
  | "threadNotFoundError"
  | "postNotFoundError"
  | "genericError";

// rpc_forum_* functions raise plain Postgres exceptions (same convention as
// src/lib/admin/error-messages.ts); match on the known message substrings so
// the UI can show a localized, friendly message.
export function mapForumRpcError(message: string | undefined): ForumErrorKey {
  if (!message) return "genericError";
  if (message.includes("not authorized")) return "notAuthorizedError";
  if (message.includes("slug and name are required")) return "slugAndNameRequiredError";
  if (message.includes("category has threads")) return "categoryHasThreadsError";
  if (message.includes("category not found")) return "categoryNotFoundError";
  if (message.includes("title and body are required")) return "titleAndBodyRequiredError";
  if (message.includes("body is required")) return "bodyRequiredError";
  if (message.includes("thread not found")) return "threadNotFoundError";
  if (message.includes("post not found")) return "postNotFoundError";
  return "genericError";
}
