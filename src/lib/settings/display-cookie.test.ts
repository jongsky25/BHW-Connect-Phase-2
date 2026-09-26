import { describe, expect, it } from "vitest";
import { defaultA11ySettings } from "./types";
import { parseDisplayCookie } from "./display-cookie";

describe("parseDisplayCookie", () => {
  it("returns defaults when there is no cookie", () => {
    expect(parseDisplayCookie(undefined)).toEqual(defaultA11ySettings);
  });

  it("returns defaults for an empty or malformed cookie value", () => {
    expect(parseDisplayCookie("")).toEqual(defaultA11ySettings);
    expect(parseDisplayCookie("not json")).toEqual(defaultA11ySettings);
    expect(parseDisplayCookie("{")).toEqual(defaultA11ySettings);
  });

  it("parses a valid JSON payload through the same allow-lists as a profile row", () => {
    expect(parseDisplayCookie(JSON.stringify({ theme: "dark", primary_color: "equity" }))).toEqual({
      ...defaultA11ySettings,
      theme: "dark",
      primary_color: "equity",
    });
  });

  it("falls back to defaults for a JSON value that isn't an object", () => {
    expect(parseDisplayCookie(JSON.stringify("dark"))).toEqual(defaultA11ySettings);
    expect(parseDisplayCookie(JSON.stringify(42))).toEqual(defaultA11ySettings);
  });

  it("ignores invalid individual fields the same way parseA11ySettings does", () => {
    expect(parseDisplayCookie(JSON.stringify({ theme: "purple", font_scale: "xl" }))).toEqual({
      ...defaultA11ySettings,
      font_scale: "xl",
    });
  });
});
