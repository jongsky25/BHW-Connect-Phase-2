export type SettingsErrorKey = "invalidInputError" | "genericError";

// rpc_update_settings raises plain Postgres exceptions (same convention as
// src/lib/kb/error-messages.ts); match on the known message substrings so
// the settings form can show a localized, friendly message.
export function mapSettingsRpcError(message: string | undefined): SettingsErrorKey {
  if (!message) return "genericError";
  if (message.includes("invalid language") || message.includes("invalid theme") || message.includes("invalid font scale")) {
    return "invalidInputError";
  }
  return "genericError";
}
