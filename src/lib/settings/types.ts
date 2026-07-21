export const themes = ["light", "dark", "system"] as const;
export type Theme = (typeof themes)[number];

export const fontScales = ["md", "lg", "xl"] as const;
export type FontScale = (typeof fontScales)[number];

export type A11ySettings = {
  theme: Theme;
  font_scale: FontScale;
  high_contrast: boolean;
};

export const defaultA11ySettings: A11ySettings = {
  theme: "system",
  font_scale: "md",
  high_contrast: false,
};

function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (themes as readonly string[]).includes(value);
}

function isFontScale(value: unknown): value is FontScale {
  return typeof value === "string" && (fontScales as readonly string[]).includes(value);
}

// a11y_settings is stored as an untyped jsonb column (defaulting to `{}`),
// so any value read back must be treated as untrusted and filled in with
// defaults for missing/invalid keys rather than trusted as shaped data.
export function parseA11ySettings(raw: unknown): A11ySettings {
  const value = (raw ?? {}) as Record<string, unknown>;

  return {
    theme: isTheme(value.theme) ? value.theme : defaultA11ySettings.theme,
    font_scale: isFontScale(value.font_scale) ? value.font_scale : defaultA11ySettings.font_scale,
    high_contrast: typeof value.high_contrast === "boolean" ? value.high_contrast : defaultA11ySettings.high_contrast,
  };
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
