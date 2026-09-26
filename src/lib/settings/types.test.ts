import { describe, expect, it } from "vitest";
import { defaultA11ySettings, displayAttributes, parseA11ySettings, parseOnboardingProgress } from "./types";

describe("parseA11ySettings", () => {
  it("returns defaults for an empty jsonb value", () => {
    expect(parseA11ySettings({})).toEqual(defaultA11ySettings);
  });

  it("returns defaults for null", () => {
    expect(parseA11ySettings(null)).toEqual(defaultA11ySettings);
  });

  it("parses a legacy row saved before this increment's keys existed", () => {
    // The original shape rpc_update_settings has always written: only
    // theme/font_scale/high_contrast, no primary_color/accent_color/etc.
    expect(parseA11ySettings({ theme: "dark", font_scale: "xl", high_contrast: true })).toEqual({
      ...defaultA11ySettings,
      theme: "dark",
      font_scale: "xl",
      high_contrast: true,
    });
  });

  it("passes through a fully valid value", () => {
    const full = {
      theme: "dark",
      font_scale: "sm",
      high_contrast: true,
      primary_color: "equity",
      accent_color: "violet",
      density: "compact",
      motion: "reduce",
      underline_links: true,
      line_spacing: "relaxed",
      reading_font: "hyperlegible",
      colorblind_status: true,
    };
    expect(parseA11ySettings(full)).toEqual(full);
  });

  it("falls back to defaults for invalid individual fields, independently of each other", () => {
    expect(
      parseA11ySettings({
        theme: "purple",
        font_scale: "xl",
        high_contrast: true,
        primary_color: "chartreuse",
        accent_color: "teal",
        density: "roomy",
        motion: "reduce",
        underline_links: "yes",
        line_spacing: "relaxed",
        reading_font: "comic-sans",
        colorblind_status: true,
      }),
    ).toEqual({
      theme: "system", // invalid -> default
      font_scale: "xl", // valid -> kept
      high_contrast: true, // valid -> kept
      primary_color: "marigold", // invalid -> default
      accent_color: "teal", // valid -> kept
      density: "comfortable", // invalid -> default
      motion: "reduce", // valid -> kept
      underline_links: false, // invalid type -> default
      line_spacing: "relaxed", // valid -> kept
      reading_font: "default", // invalid -> default (typo'd id, not a real value)
      colorblind_status: true, // valid -> kept
    });
  });

  it("never lets an unrecognized top-level shape (e.g. a plain string) throw", () => {
    expect(parseA11ySettings("not an object")).toEqual(defaultA11ySettings);
    expect(parseA11ySettings(42)).toEqual(defaultA11ySettings);
  });
});

describe("displayAttributes", () => {
  it("emits no attributes for the all-default settings", () => {
    expect(displayAttributes(defaultA11ySettings)).toEqual({});
  });

  it("emits only the attributes that differ from default", () => {
    expect(
      displayAttributes({
        ...defaultA11ySettings,
        theme: "dark",
        primary_color: "equity",
      }),
    ).toEqual({
      "data-theme": "dark",
      "data-primary": "equity",
    });
  });

  it("maps every non-default field to its own attribute", () => {
    expect(
      displayAttributes({
        theme: "light",
        font_scale: "lg",
        high_contrast: true,
        primary_color: "teal",
        accent_color: "rose",
        density: "compact",
        motion: "reduce",
        underline_links: true,
        line_spacing: "relaxed",
        reading_font: "hyperlegible",
        colorblind_status: true,
      }),
    ).toEqual({
      "data-theme": "light",
      "data-font-scale": "lg",
      "data-contrast": "high",
      "data-primary": "teal",
      "data-accent": "rose",
      "data-density": "compact",
      "data-motion": "reduce",
      "data-underline-links": "true",
      "data-line-spacing": "relaxed",
      "data-reading-font": "hyperlegible",
      "data-colorblind-status": "true",
    });
  });

  it("treats theme 'system' as the default, matching the current layout's omission rule", () => {
    expect(displayAttributes({ ...defaultA11ySettings, theme: "system" })["data-theme"]).toBeUndefined();
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
