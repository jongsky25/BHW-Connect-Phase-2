import type { AccentColor, PrimaryColor } from "./types";

// The one permitted exception to "hex values live only in tokens.css"
// (docs/header-navigation-display-settings-plan.md §3 rule 3, increment
// 3.2): the PWA install chrome reads `theme-color` before any of our CSS
// loads, so it can't be expressed as `var(--color-primary)` — it needs a
// literal hex up front, per request, matching whichever colourway the
// visitor has chosen. Each value here must equal that colourway's
// `--color-primary` in tokens.css; palette.test.ts checks they stay in
// lockstep, and tokens-contrast.test.ts is what validated the hex in the
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

// One-tap main+accent pairs (increment 3.3, docs plan §6 3.3). Picking a
// preset sets both `primary_color` and `accent_color`; changing either key
// afterwards makes the picker show "Custom" — that comparison and the rest
// of the picker UI is increment 3.5, this is just the shared data both that
// UI and the settings RPC agree on.
export type ColorPreset = {
  id: "bayanihan" | "equity" | "garden" | "sunrise" | "calm";
  primary: PrimaryColor;
  accent: AccentColor;
};

export const colorPresets: readonly ColorPreset[] = [
  { id: "bayanihan", primary: "marigold", accent: "teal" },
  { id: "equity", primary: "equity", accent: "marigold" },
  { id: "garden", primary: "emerald", accent: "violet" },
  { id: "sunrise", primary: "rose", accent: "marigold" },
  { id: "calm", primary: "slate", accent: "teal" },
];
