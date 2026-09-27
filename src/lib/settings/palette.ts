import type { PrimaryColor } from "./types";

// The one permitted exception to "hex values live only in tokens.css"
// (docs/header-navigation-display-settings-plan.md §3 rule 3, increment
// 3.2): the PWA install chrome reads `theme-color` before any of our CSS
// loads, so it can't be expressed as `var(--color-primary)` — it needs a
// literal hex up front, per request, matching whichever colourway the
// visitor has chosen. Each value here must equal that colourway's
// `--color-primary` in tokens.css; primaryColorHex.test.ts checks they stay
// in lockstep, and tokens-contrast.test.ts is what validated the hex in the
// first place.
export const primaryColorHex: Record<PrimaryColor, string> = {
  marigold: "#b84e12",
  equity: "#1f63e9",
  teal: "#0f7878",
  violet: "#7857c9",
  emerald: "#1f7b4e",
  rose: "#c33563",
  crimson: "#ce2c23",
  slate: "#5b6d87",
};
