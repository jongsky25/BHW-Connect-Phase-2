export type DashboardErrorKey = "notAuthorizedError" | "gapNotFoundError" | "genericError";

// rpc_dashboard_* / rpc_gap_dismiss raise plain Postgres exceptions (same
// convention as src/lib/kb/error-messages.ts); match on the known message
// substrings so the console can show a localized, friendly message.
export function mapDashboardRpcError(message: string | undefined): DashboardErrorKey {
  if (!message) return "genericError";
  if (message.includes("not authorized")) return "notAuthorizedError";
  if (message.includes("gap not found")) return "gapNotFoundError";
  return "genericError";
}
