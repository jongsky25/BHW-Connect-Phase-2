export type FlipchartErrorKey =
  | "notAuthorizedError"
  | "titleRequiredError"
  | "pageRequiredError"
  | "pageImageRequiredError"
  | "pageScriptRequiredError"
  | "flipchartNotFoundError"
  | "onlyDraftSubmittableError"
  | "onlyInReviewDecidableError"
  | "publishedNotDeletableError"
  | "genericError";

// rpc_flipchart_* functions raise plain Postgres exceptions (same
// convention as src/lib/admin/error-messages.ts); match on the known
// message substrings so the UI can show a localized, friendly message.
// Order matters: more specific substrings are checked before the more
// generic ones they'd otherwise collide with (e.g. the two "requires a
// ..." messages before a hypothetical bare "required" check).
export function mapFlipchartRpcError(message: string | undefined): FlipchartErrorKey {
  if (!message) return "genericError";
  if (message.includes("not authorized")) return "notAuthorizedError";
  if (message.includes("title is required")) return "titleRequiredError";
  if (message.includes("at least one page is required")) return "pageRequiredError";
  if (message.includes("requires a client-facing image")) return "pageImageRequiredError";
  if (message.includes("requires a script in both languages")) return "pageScriptRequiredError";
  if (message.includes("flip chart not found")) return "flipchartNotFoundError";
  if (message.includes("only a draft can be submitted")) return "onlyDraftSubmittableError";
  if (message.includes("only a chart in review can be")) return "onlyInReviewDecidableError";
  if (message.includes("published flip chart cannot be deleted")) return "publishedNotDeletableError";
  return "genericError";
}
