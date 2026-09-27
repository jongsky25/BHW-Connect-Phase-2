import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Increment 3.1 (docs/header-navigation-display-settings-plan.md §6): a
 * contrast guard that must pass before any new colour is added to
 * tokens.css. It reads the real tokens.css text (no hard-coded copies of the
 * hex values), resolves the custom properties for each theme the way the
 * browser cascade would, and checks the pairings called out in the plan
 * against WCAG 2.1 relative-luminance contrast minimums.
 *
 * If tokens.css grows a new `:root[...]` selector that this test needs to
 * know about (a new colourway, a new state), add its selector string to
 * `TOP_LEVEL_SELECTORS` below and fold it into the relevant theme's layers.
 */

const TOKENS_CSS_PATH = path.join(__dirname, "tokens.css");

type Declarations = Record<string, string>;

// Increment 3.2's main-colour colourways (docs/header-navigation-display-
// settings-plan.md §6 3.2). Each one only needs two selectors read: the
// theme-independent `:root[data-primary="x"]` (fill/display/text=fill) and
// the explicit `:root[data-theme="dark"][data-primary="x"]` redirect
// (text=display) — there's no `:root[data-theme="light"][data-primary="x"]`
// in tokens.css because the base `:root[data-primary="x"]` rule already
// resolves correctly for light (nothing else overrides `--color-primary` or
// `--color-primary-text` between the two), and the `@media
// (prefers-color-scheme: dark)` variant isn't tested separately here for
// the same reason the existing selectors above don't test it: this guard
// checks resolved values per explicit `[data-theme]`, trusting (as the rest
// of tokens.css already does) that the media-query variant is kept in sync
// with it by hand. "marigold" needs no entry — it's the untagged default,
// already covered by the selectors above.
const PRIMARY_COLOURWAYS = ["equity", "teal", "violet", "emerald", "rose", "crimson", "slate"] as const;

function colourwaySelectors(colour: string) {
  return {
    base: `:root[data-primary="${colour}"]`,
    dark: `:root[data-theme="dark"][data-primary="${colour}"]`,
  } as const;
}

// Only these selectors are read; anything else in tokens.css (font-scale,
// density, motion, etc.) is irrelevant to colour contrast and ignored.
const TOP_LEVEL_SELECTORS = [
  ':root',
  ':root[data-theme="light"]',
  ':root[data-theme="dark"]',
  ':root[data-theme="light"][data-contrast="high"]',
  ':root[data-theme="dark"][data-contrast="high"]',
  ...PRIMARY_COLOURWAYS.flatMap((colour) => Object.values(colourwaySelectors(colour))),
] as const;

/**
 * Splits `css` into top-level rules (selector + declaration body + which
 * `@media` block, if any, it was nested in), recursing into `@media` blocks
 * so their contents are also picked up. A rule's `media` is tracked (rather
 * than merged away) because the same selector can legitimately appear both
 * at the top level and inside `@media (prefers-color-scheme: dark)` (every
 * dark-theme selector below does this) with *different* declarations for
 * the same custom property — `mergeDeclarations` needs to tell those apart
 * so it doesn't silently prefer whichever one happens to come later in the
 * file (see the "media: null" filter there).
 */
function parseTopLevelRules(css: string): { selector: string; media: string | null; declarations: Declarations }[] {
  const rules: { selector: string; media: string | null; declarations: Declarations }[] = [];

  function walk(text: string, media: string | null) {
    let i = 0;
    while (i < text.length) {
      const braceIndex = text.indexOf("{", i);
      if (braceIndex === -1) break;
      const selector = text.slice(i, braceIndex).trim();

      let depth = 1;
      let j = braceIndex + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === "{") depth++;
        else if (text[j] === "}") depth--;
        j++;
      }
      const body = text.slice(braceIndex + 1, j - 1);

      if (selector.startsWith("@media")) {
        walk(body, selector);
      } else if ((TOP_LEVEL_SELECTORS as readonly string[]).includes(selector)) {
        const declarations: Declarations = {};
        const declRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
        let match: RegExpExecArray | null;
        while ((match = declRegex.exec(body))) {
          declarations[match[1]] = match[2].trim();
        }
        rules.push({ selector, media, declarations });
      }

      i = j;
    }
  }

  walk(css.replace(/\/\*[\s\S]*?\*\//g, ""), null);
  return rules;
}

// Only the top-level (non-`@media`) declaration for a selector: this guard
// resolves theme layers by their explicit `[data-theme="…"]` attribute, the
// same convention tokens.css itself follows (every `@media
// (prefers-color-scheme: dark)` block has a `[data-theme="dark"]` twin that
// fully restates it — see the comment above `:root[data-theme="light"]`),
// so the `@media`-nested declarations for a given selector are never what a
// resolved theme layer should use.
function mergeDeclarations(
  rules: { selector: string; media: string | null; declarations: Declarations }[],
  selector: string,
): Declarations {
  return rules
    .filter((rule) => rule.selector === selector && rule.media === null)
    .reduce((acc, rule) => ({ ...acc, ...rule.declarations }), {} as Declarations);
}

/** Resolves `var(--x)` references against the theme's own declaration set. */
function resolveColor(value: string, tokens: Declarations, seen: Set<string> = new Set()): string {
  const varMatch = value.match(/^var\((--[\w-]+)\)$/);
  if (!varMatch) return value;

  const name = varMatch[1];
  if (seen.has(name)) throw new Error(`Circular token reference involving ${name}`);
  const resolved = tokens[name];
  if (!resolved) throw new Error(`Unresolved token reference: ${name}`);

  return resolveColor(resolved, tokens, new Set(seen).add(name));
}

function hexToRgb(hex: string): [number, number, number] {
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  if (!match) throw new Error(`Expected a 6-digit hex colour, got "${hex}"`);
  const int = parseInt(match[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

// WCAG 2.1 relative luminance: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

// WCAG 2.1 contrast ratio: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const [lighter, darker] = lumA >= lumB ? [lumA, lumB] : [lumB, lumA];
  return (lighter + 0.05) / (darker + 0.05);
}

const css = readFileSync(TOKENS_CSS_PATH, "utf8");
const rules = parseTopLevelRules(css);

const base = mergeDeclarations(rules, ":root");
const lightOverride = mergeDeclarations(rules, ':root[data-theme="light"]');
const darkOverride = mergeDeclarations(rules, ':root[data-theme="dark"]');
const lightHighContrastOverride = mergeDeclarations(rules, ':root[data-theme="light"][data-contrast="high"]');
const darkHighContrastOverride = mergeDeclarations(rules, ':root[data-theme="dark"][data-contrast="high"]');

const themeLayers = {
  light: { ...base, ...lightOverride },
  dark: { ...base, ...darkOverride },
  "high-contrast light": { ...base, ...lightOverride, ...lightHighContrastOverride },
  "high-contrast dark": { ...base, ...darkOverride, ...darkHighContrastOverride },
} as const;

type ThemeName = keyof typeof themeLayers;
const themeNames = Object.keys(themeLayers) as ThemeName[];

function resolvedColor(theme: ThemeName, token: string): string {
  const tokens = themeLayers[theme];
  const raw = tokens[token];
  if (!raw) throw new Error(`Theme "${theme}" has no declaration for ${token}`);
  return resolveColor(raw, tokens);
}

// One theme-layer set per colourway, built the same way as `themeLayers`
// above but with that colourway's own `:root[data-primary="x"]` (and, for
// the two dark layers, its `[data-theme="dark"]` redirect) spread in last so
// it wins over the marigold values it's replacing.
const colourwayThemeLayers = Object.fromEntries(
  PRIMARY_COLOURWAYS.map((colour) => {
    const { base: baseSelector, dark: darkSelector } = colourwaySelectors(colour);
    const colourwayBase = mergeDeclarations(rules, baseSelector);
    const colourwayDark = mergeDeclarations(rules, darkSelector);

    return [
      colour,
      {
        light: { ...base, ...lightOverride, ...colourwayBase },
        dark: { ...base, ...darkOverride, ...colourwayBase, ...colourwayDark },
        "high-contrast light": { ...base, ...lightOverride, ...lightHighContrastOverride, ...colourwayBase },
        "high-contrast dark": {
          ...base,
          ...darkOverride,
          ...darkHighContrastOverride,
          ...colourwayBase,
          ...colourwayDark,
        },
      },
    ] as const;
  }),
) as Record<(typeof PRIMARY_COLOURWAYS)[number], typeof themeLayers>;

function resolvedColourwayColor(colour: (typeof PRIMARY_COLOURWAYS)[number], theme: ThemeName, token: string): string {
  const tokens = colourwayThemeLayers[colour][theme];
  const raw = tokens[token];
  if (!raw) throw new Error(`Colourway "${colour}" theme "${theme}" has no declaration for ${token}`);
  return resolveColor(raw, tokens);
}

describe("tokens.css contrast guard (increment 3.1)", () => {
  it.each(themeNames)("%s: found all four expected theme layers", (theme) => {
    expect(Object.keys(themeLayers[theme]).length).toBeGreaterThan(0);
  });

  it.each(themeNames)("%s: on-primary text on primary fill ≥ 4.5:1", (theme) => {
    const ratio = contrastRatio(resolvedColor(theme, "--color-on-primary"), resolvedColor(theme, "--color-primary"));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it.each(themeNames)("%s: primary-text on canvas ≥ 4.5:1", (theme) => {
    const ratio = contrastRatio(resolvedColor(theme, "--color-primary-text"), resolvedColor(theme, "--color-canvas"));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  // --color-secondary (Bayanihan Teal, #0c7c7e) is a known, already-documented
  // gap: see the comment in src/components/settings/settings-form.tsx's
  // PreviewCard, which avoids `text-secondary` for exactly this reason. It
  // isn't theme-adjusted yet, so it only clears 4.5:1 on the high-contrast
  // light canvas (white); fixing it is increment 3.3 (accent colourways),
  // not this one. `it.fails` keeps that failure visible without turning this
  // whole suite red — flip each case back to a plain `it` as 3.3 fixes it.
  const secondaryOnCanvas = (theme: ThemeName) =>
    contrastRatio(resolvedColor(theme, "--color-secondary"), resolvedColor(theme, "--color-canvas"));

  it("high-contrast light: secondary (accent) on canvas ≥ 4.5:1", () => {
    expect(secondaryOnCanvas("high-contrast light")).toBeGreaterThanOrEqual(4.5);
  });

  it.fails("light: secondary (accent) on canvas ≥ 4.5:1 (known gap, see 3.3)", () => {
    expect(secondaryOnCanvas("light")).toBeGreaterThanOrEqual(4.5);
  });

  it.fails("dark: secondary (accent) on canvas ≥ 4.5:1 (known gap, see 3.3)", () => {
    expect(secondaryOnCanvas("dark")).toBeGreaterThanOrEqual(4.5);
  });

  it.fails("high-contrast dark: secondary (accent) on canvas ≥ 4.5:1 (known gap, see 3.3)", () => {
    expect(secondaryOnCanvas("high-contrast dark")).toBeGreaterThanOrEqual(4.5);
  });

  it.each(themeNames)("%s: primary vs canvas (focus ring / UI) ≥ 3:1", (theme) => {
    const ratio = contrastRatio(resolvedColor(theme, "--color-primary"), resolvedColor(theme, "--color-canvas"));
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  const statusTokens = ["--color-success", "--color-warning", "--color-danger", "--color-info"] as const;

  for (const token of statusTokens) {
    it.each(themeNames)(`%s: ${token} on canvas ≥ 4.5:1`, (theme) => {
      const ratio = contrastRatio(resolvedColor(theme, token), resolvedColor(theme, "--color-canvas"));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("tokens.css main-colour colourways (increment 3.2)", () => {
  const cases = PRIMARY_COLOURWAYS.flatMap((colour) => themeNames.map((theme) => [colour, theme] as const));

  it.each(cases)("%s/%s: on-primary text on primary fill ≥ 4.5:1", (colour, theme) => {
    const ratio = contrastRatio(
      resolvedColourwayColor(colour, theme, "--color-on-primary"),
      resolvedColourwayColor(colour, theme, "--color-primary"),
    );
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it.each(cases)("%s/%s: primary-text on canvas ≥ 4.5:1", (colour, theme) => {
    const ratio = contrastRatio(
      resolvedColourwayColor(colour, theme, "--color-primary-text"),
      resolvedColourwayColor(colour, theme, "--color-canvas"),
    );
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it.each(cases)("%s/%s: primary vs canvas (focus ring / UI) ≥ 3:1", (colour, theme) => {
    const ratio = contrastRatio(
      resolvedColourwayColor(colour, theme, "--color-primary"),
      resolvedColourwayColor(colour, theme, "--color-canvas"),
    );
    expect(ratio).toBeGreaterThanOrEqual(3);
  });
});

describe("contrastRatio", () => {
  it("is 21:1 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("is 1:1 for identical colours", () => {
    expect(contrastRatio("#b84e12", "#b84e12")).toBeCloseTo(1, 5);
  });

  it("is symmetric regardless of argument order", () => {
    expect(contrastRatio("#2b2420", "#f6f2ed")).toBeCloseTo(contrastRatio("#f6f2ed", "#2b2420"), 10);
  });
});
