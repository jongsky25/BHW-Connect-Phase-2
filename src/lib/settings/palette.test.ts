import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { accentColors, primaryColors } from "./types";
import { colorPresets, primaryColorHex } from "./palette";

// primaryColorHex duplicates tokens.css's --color-primary per colourway (see
// the comment on that map for why). This test is what keeps the duplicate
// honest: it re-reads tokens.css and checks each entry against the actual
// `--color-primary` declared for that colourway's `:root[data-primary="x"]`
// rule (or the unconditioned `:root` block, for the "marigold" default).
const tokensCss = readFileSync(path.join(__dirname, "../../styles/tokens.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

function primaryFillFor(colour: string): string {
  const selector = colour === "marigold" ? ":root" : `:root[data-primary="${colour}"]`;
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockMatch = tokensCss.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  if (!blockMatch) throw new Error(`No "${selector}" rule found in tokens.css`);

  const propMatch = blockMatch[1].match(/--color-primary:\s*(#[0-9a-fA-F]{6})\s*;/);
  if (!propMatch) throw new Error(`"${selector}" has no --color-primary declaration`);
  return propMatch[1].toLowerCase();
}

describe("primaryColorHex", () => {
  it("has an entry for every colourway id", () => {
    expect(Object.keys(primaryColorHex).sort()).toEqual([...primaryColors].sort());
  });

  it.each(primaryColors)("%s matches tokens.css's --color-primary for that colourway", (colour) => {
    expect(primaryColorHex[colour].toLowerCase()).toBe(primaryFillFor(colour));
  });

  it("every value is a 6-digit hex colour", () => {
    for (const hex of Object.values(primaryColorHex)) {
      expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("colorPresets", () => {
  it("has one entry per preset id, no duplicates", () => {
    const ids = colorPresets.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(colorPresets.map((preset) => [preset.id, preset] as const))(
    "%s: primary and accent are both valid colourway ids",
    (_id, preset) => {
      expect(primaryColors).toContain(preset.primary);
      expect(accentColors).toContain(preset.accent);
    },
  );

  it("matches the plan's preset table (docs/header-navigation-display-settings-plan.md §6 3.3)", () => {
    expect(colorPresets).toEqual([
      { id: "bayanihan", primary: "marigold", accent: "teal" },
      { id: "equity", primary: "equity", accent: "marigold" },
      { id: "garden", primary: "emerald", accent: "violet" },
      { id: "sunrise", primary: "rose", accent: "marigold" },
      { id: "calm", primary: "slate", accent: "teal" },
    ]);
  });
});
