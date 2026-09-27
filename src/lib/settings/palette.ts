import type { AccentColor, PrimaryColor } from "./types";

// The permitted exceptions to "hex values live only in tokens.css"
// (docs/header-navigation-display-settings-plan.md §3 rule 3): two things
// can't reference a CSS custom property.
//
// - The PWA install chrome (increment 3.2) reads `theme-color` before any of
//   our CSS loads, so it needs a literal hex up front, per request, matching
//   whichever colourway the visitor has chosen.
// - The colour picker (increment 3.5, Settings → Colours) needs to preview
//   *every* colourway's own swatch side by side, not just whichever one
//   happens to be active on <html> right now — `:root[data-primary="x"]`
//   only ever matches the actual document root, so there's no CSS-only way
//   to render another colourway's value on an arbitrary swatch element.
//
// Each value here must equal that colourway's `--color-primary` (or, for
// accents, `--color-secondary`) in tokens.css; palette.test.ts checks they
// stay in lockstep, and tokens-contrast.test.ts is what validated the hex in
// the first place.
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

export const accentColorHex: Record<AccentColor, string> = {
  teal: "#0c787a",
  equity: "#1f63e9",
  marigold: "#b84e12",
  emerald: "#1f7b4e",
  violet: "#7857c9",
  rose: "#c33563",
  slate: "#5b6d87",
};

// One-tap main+accent pairs (increment 3.3, docs plan §6 3.3). Picking a
// preset sets both `primary_color` and `accent_color`; changing either key
// afterwards makes the picker show "Custom" (increment 3.5's Settings →
// Colours and the header's quick-display popover both compare against this
// list to decide that).
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
