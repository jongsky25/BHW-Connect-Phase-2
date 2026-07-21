export type ReportsErrorKey = "notAuthorizedError" | "invalidFormatError" | "genericError";

// rpc_reports_kpi_summary / rpc_report_exported raise plain Postgres
// exceptions (same convention as src/lib/dashboard/error-messages.ts).
export function mapReportsRpcError(message: string | undefined): ReportsErrorKey {
  if (!message) return "genericError";
  if (message.includes("not authorized")) return "notAuthorizedError";
  if (message.includes("invalid export format")) return "invalidFormatError";
  return "genericError";
}
