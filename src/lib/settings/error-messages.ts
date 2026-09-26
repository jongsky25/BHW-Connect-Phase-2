export type SettingsErrorKey = "invalidInputError" | "genericError";

// rpc_update_settings and rpc_update_display_settings (increment 2.2) raise
// plain Postgres exceptions (same convention as src/lib/kb/error-messages.ts);
// match on the known message substrings so the settings form can show a
// localized, friendly message. "invalid display setting: <key>" and the
// no-object-payload "invalid display settings" both start with "invalid
// display setting", so the startsWith check covers either.
export function mapSettingsRpcError(message: string | undefined): SettingsErrorKey {
  if (!message) return "genericError";
  if (
    message.includes("invalid language") ||
    message.includes("invalid theme") ||
    message.includes("invalid font scale") ||
    message.startsWith("invalid display setting")
  ) {
    return "invalidInputError";
  }
  return "genericError";
}
