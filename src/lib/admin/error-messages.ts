export type AdminErrorKey =
  | "lastAdminError"
  | "notAuthorizedError"
  | "outOfScopeError"
  | "usernameRequiredError"
  | "userNotFoundError"
  | "flagNotFoundError"
  | "invalidRoleForFlagError"
  | "courseNotFoundError"
  | "targetNotBhwError"
  | "assessmentBlocksResetError"
  | "assessorLevelError"
  | "bhwLevelError"
  | "contentArchivedError"
  | "contentNotFoundError"
  | "invalidContentTypeError"
  | "invalidActionError"
  | "alreadyHiddenError"
  | "notHiddenError"
  | "alreadyArchivedError"
  | "notArchivedError"
  | "useArchiveActionError"
  | "genericError";

// rpc_admin_* functions raise plain Postgres exceptions (delivery-plan.md
// §6 doesn't define a structured error code scheme yet); match on the
// known message substrings so the console can show a localized, friendly
// message instead of the raw exception text.
export function mapAdminRpcError(message: string | undefined): AdminErrorKey {
  if (!message) return "genericError";
  if (message.includes("cannot reset")) return "assessmentBlocksResetError";
  if (message.includes("last active admin")) return "lastAdminError";
  if (message.includes("not authorized")) return "notAuthorizedError";
  if (message.includes("out of scope")) return "outOfScopeError";
  if (message.includes("username is required")) return "usernameRequiredError";
  if (message.includes("user not found")) return "userNotFoundError";
  if (message.includes("course not found")) return "courseNotFoundError";
  if (message.includes("is not a BHW")) return "targetNotBhwError";
  if (message.includes("flag not found")) return "flagNotFoundError";
  if (message.includes("invalid role for flag")) return "invalidRoleForFlagError";
  if (message.includes("assessor catchment")) return "assessorLevelError";
  if (message.includes("bhw must belong to a barangay")) return "bhwLevelError";
  if (message.includes("use archive action")) return "useArchiveActionError";
  if (message.includes("content archived")) return "contentArchivedError";
  if (message.includes("content not found")) return "contentNotFoundError";
  if (message.includes("invalid content type")) return "invalidContentTypeError";
  if (message.includes("invalid action")) return "invalidActionError";
  if (message.includes("already hidden")) return "alreadyHiddenError";
  if (message.includes("not hidden")) return "notHiddenError";
  if (message.includes("already archived")) return "alreadyArchivedError";
  if (message.includes("not archived")) return "notArchivedError";
  return "genericError";
}
