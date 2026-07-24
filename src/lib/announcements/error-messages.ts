export type AnnouncementErrorKey =
  | "notAuthorizedError"
  | "bodyRequiredError"
  | "orgUnitOutOfScopeError"
  | "announcementNotFoundError"
  | "genericError";

// rpc_announcement_* functions raise plain Postgres exceptions (same
// convention as src/lib/admin/error-messages.ts); match on the known
// message substrings so the console can show a localized, friendly message.
export function mapAnnouncementRpcError(message: string | undefined): AnnouncementErrorKey {
  if (!message) return "genericError";
  if (message.includes("not authorized")) return "notAuthorizedError";
  if (message.includes("body is required")) return "bodyRequiredError";
  if (message.includes("org unit out of scope")) return "orgUnitOutOfScopeError";
  if (message.includes("announcement not found")) return "announcementNotFoundError";
  return "genericError";
}
