export type AdminErrorKey =
  | "lastAdminError"
  | "notAuthorizedError"
  | "outOfScopeError"
  | "usernameRequiredError"
  | "userNotFoundError"
  | "flagNotFoundError"
  | "courseNotFoundError"
  | "targetNotBhwError"
  | "assessmentBlocksResetError"
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
  return "genericError";
}
