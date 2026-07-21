import { describe, expect, it } from "vitest";
import { defaultA11ySettings, parseA11ySettings, parseOnboardingProgress } from "./types";

describe("parseA11ySettings", () => {
  it("returns defaults for an empty jsonb value", () => {
    expect(parseA11ySettings({})).toEqual(defaultA11ySettings);
  });

  it("returns defaults for null", () => {
    expect(parseA11ySettings(null)).toEqual(defaultA11ySettings);
  });

  it("passes through a fully valid value", () => {
    expect(parseA11ySettings({ theme: "dark", font_scale: "xl", high_contrast: true })).toEqual({
      theme: "dark",
      font_scale: "xl",
      high_contrast: true,
    });
  });

  it("falls back to defaults for invalid individual fields", () => {
    expect(parseA11ySettings({ theme: "purple", font_scale: "xl", high_contrast: true })).toEqual({
      theme: "system",
      font_scale: "xl",
      high_contrast: true,
    });
    expect(parseA11ySettings({ theme: "dark", font_scale: "huge", high_contrast: "yes" })).toEqual({
      theme: "dark",
      font_scale: "md",
      high_contrast: false,
    });
  });
});

describe("parseOnboardingProgress", () => {
  it("defaults every step to false for an empty value", () => {
    expect(parseOnboardingProgress({})).toEqual({ language: false, chat: false, kb: false });
  });

  it("reads completed steps and ignores unknown keys", () => {
    expect(parseOnboardingProgress({ language: true, somethingElse: true })).toEqual({
      language: true,
      chat: false,
      kb: false,
    });
  });
});
