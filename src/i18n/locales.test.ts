import { describe, expect, it } from "vitest";
import { defaultLocale, isLocale, locales } from "./locales";

describe("isLocale", () => {
  it("accepts every configured locale", () => {
    for (const locale of locales) {
      expect(isLocale(locale)).toBe(true);
    }
  });

  it("rejects an unsupported locale", () => {
    expect(isLocale("es")).toBe(false);
  });

  it("defaults to Filipino", () => {
    expect(defaultLocale).toBe("fil");
  });
});
