export const themes = ["light", "dark", "system"] as const;
export type Theme = (typeof themes)[number];

// "sm" is a Phase 4 addition (docs/header-navigation-display-settings-plan.md
// §5, increment 2.1). The live settings form (settings-form.tsx) renders its
// own literal list of options rather than mapping over this array, so
// widening it here does not add a button the current settings RPC (which
// only accepts md/lg/xl) would reject. A later increment (2.2 + 2.4) wires
// "sm" through the RPC and the restructured settings page.
export const fontScales = ["sm", "md", "lg", "xl"] as const;
export type FontScale = (typeof fontScales)[number];

// Colourway ids for the two independent colour picks (docs plan §6,
// increments 3.2/3.3). The actual CSS token values for each id are added in
// those increments; this file only owns the allow-lists and defaults so the
// settings model, the future RPC, and the future picker UI all agree on the
// same set of ids.
export const primaryColors = [
  "marigold",
  "equity",
  "teal",
  "emerald",
  "violet",
  "rose",
  "crimson",
  "slate",
] as const;
export type PrimaryColor = (typeof primaryColors)[number];

export const accentColors = ["teal", "equity", "marigold", "emerald", "violet", "rose", "slate"] as const;
export type AccentColor = (typeof accentColors)[number];

export const densities = ["comfortable", "compact"] as const;
export type Density = (typeof densities)[number];

export const motionPreferences = ["system", "reduce"] as const;
export type MotionPreference = (typeof motionPreferences)[number];

export const lineSpacings = ["normal", "relaxed"] as const;
export type LineSpacing = (typeof lineSpacings)[number];

export const readingFonts = ["default", "hyperlegible"] as const;
export type ReadingFont = (typeof readingFonts)[number];

export type A11ySettings = {
  theme: Theme;
  font_scale: FontScale;
  high_contrast: boolean;
  primary_color: PrimaryColor;
  accent_color: AccentColor;
  density: Density;
  motion: MotionPreference;
  underline_links: boolean;
  line_spacing: LineSpacing;
  reading_font: ReadingFont;
  colorblind_status: boolean;
};

export const defaultA11ySettings: A11ySettings = {
  theme: "system",
  font_scale: "md",
  high_contrast: false,
  primary_color: "marigold",
  accent_color: "teal",
  density: "comfortable",
  motion: "system",
  underline_links: false,
  line_spacing: "normal",
  reading_font: "default",
  colorblind_status: false,
};

function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (themes as readonly string[]).includes(value);
}

function isFontScale(value: unknown): value is FontScale {
  return typeof value === "string" && (fontScales as readonly string[]).includes(value);
}

function isPrimaryColor(value: unknown): value is PrimaryColor {
  return typeof value === "string" && (primaryColors as readonly string[]).includes(value);
}

function isAccentColor(value: unknown): value is AccentColor {
  return typeof value === "string" && (accentColors as readonly string[]).includes(value);
}

function isDensity(value: unknown): value is Density {
  return typeof value === "string" && (densities as readonly string[]).includes(value);
}

function isMotionPreference(value: unknown): value is MotionPreference {
  return typeof value === "string" && (motionPreferences as readonly string[]).includes(value);
}

function isLineSpacing(value: unknown): value is LineSpacing {
  return typeof value === "string" && (lineSpacings as readonly string[]).includes(value);
}

function isReadingFont(value: unknown): value is ReadingFont {
  return typeof value === "string" && (readingFonts as readonly string[]).includes(value);
}

// a11y_settings is stored as an untyped jsonb column (defaulting to `{}`),
// so any value read back must be treated as untrusted and filled in with
// defaults for missing/invalid keys rather than trusted as shaped data.
// This also keeps rows saved before a given key existed (e.g. `{}`, or the
// original `{theme, font_scale, high_contrast}` shape) parsing correctly.
export function parseA11ySettings(raw: unknown): A11ySettings {
  const value = (raw ?? {}) as Record<string, unknown>;

  return {
    theme: isTheme(value.theme) ? value.theme : defaultA11ySettings.theme,
    font_scale: isFontScale(value.font_scale) ? value.font_scale : defaultA11ySettings.font_scale,
    high_contrast: typeof value.high_contrast === "boolean" ? value.high_contrast : defaultA11ySettings.high_contrast,
    primary_color: isPrimaryColor(value.primary_color) ? value.primary_color : defaultA11ySettings.primary_color,
    accent_color: isAccentColor(value.accent_color) ? value.accent_color : defaultA11ySettings.accent_color,
    density: isDensity(value.density) ? value.density : defaultA11ySettings.density,
    motion: isMotionPreference(value.motion) ? value.motion : defaultA11ySettings.motion,
    underline_links:
      typeof value.underline_links === "boolean" ? value.underline_links : defaultA11ySettings.underline_links,
    line_spacing: isLineSpacing(value.line_spacing) ? value.line_spacing : defaultA11ySettings.line_spacing,
    reading_font: isReadingFont(value.reading_font) ? value.reading_font : defaultA11ySettings.reading_font,
    colorblind_status:
      typeof value.colorblind_status === "boolean" ? value.colorblind_status : defaultA11ySettings.colorblind_status,
  };
}

/**
 * Maps display settings to the `<html>` data-attributes that apply them.
 * Only non-default values produce an attribute, so a brand-new profile (or a
 * signed-out visitor with no cookie) renders with none of these set and
 * falls through to the CSS-only defaults. Not wired into any layout yet —
 * increment 2.3 does that; this increment only adds the mapping itself.
 */
export function displayAttributes(settings: A11ySettings): Record<string, string> {
  const attrs: Record<string, string> = {};

  if (settings.theme !== defaultA11ySettings.theme) attrs["data-theme"] = settings.theme;
  if (settings.font_scale !== defaultA11ySettings.font_scale) attrs["data-font-scale"] = settings.font_scale;
  if (settings.high_contrast) attrs["data-contrast"] = "high";
  if (settings.primary_color !== defaultA11ySettings.primary_color) attrs["data-primary"] = settings.primary_color;
  if (settings.accent_color !== defaultA11ySettings.accent_color) attrs["data-accent"] = settings.accent_color;
  if (settings.density !== defaultA11ySettings.density) attrs["data-density"] = settings.density;
  if (settings.motion !== defaultA11ySettings.motion) attrs["data-motion"] = settings.motion;
  if (settings.underline_links) attrs["data-underline-links"] = "true";
  if (settings.line_spacing !== defaultA11ySettings.line_spacing) attrs["data-line-spacing"] = settings.line_spacing;
  if (settings.reading_font !== defaultA11ySettings.reading_font) attrs["data-reading-font"] = settings.reading_font;
  if (settings.colorblind_status) attrs["data-colorblind-status"] = "true";

  return attrs;
}

export type OnboardingStep = "language" | "chat" | "kb";

export const onboardingSteps: OnboardingStep[] = ["language", "chat", "kb"];

export function parseOnboardingProgress(raw: unknown): Record<OnboardingStep, boolean> {
  const value = (raw ?? {}) as Record<string, unknown>;

  return {
    language: value.language === true,
    chat: value.chat === true,
    kb: value.kb === true,
  };
}
