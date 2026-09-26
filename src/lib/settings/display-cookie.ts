import { parseA11ySettings, type A11ySettings } from "./types";

// Written by the header's quick-display popover for a signed-out visitor
// (docs/header-navigation-display-settings-plan.md §6, increment 3.5),
// since there's no profile row to persist to yet. The root layout
// (increment 2.3) reads it as the signed-out fallback; a signed-in
// profile's a11y_settings always wins over this cookie (mirrors how
// BHW_LOCALE/src/i18n/request.ts only matters when there's no profile
// language to read).
export const displayCookieName = "BHW_DISPLAY";

export function parseDisplayCookie(raw: string | undefined): A11ySettings {
  if (!raw) return parseA11ySettings(null);

  try {
    return parseA11ySettings(JSON.parse(raw));
  } catch {
    return parseA11ySettings(null);
  }
}
