import { describe, expect, it } from "vitest";
import { normalizeText, tokenize } from "./normalize";

describe("normalizeText", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalizeText("  May LAGNAT ba ang sanggol?!  ")).toBe("may lagnat ba ang sanggol");
  });

  it("keeps Filipino diacritics", () => {
    expect(normalizeText("Ilán, na Buntís?")).toBe("ilán na buntís");
  });

  it("returns an empty string for punctuation-only input", () => {
    expect(normalizeText("???")).toBe("");
  });
});

describe("tokenize", () => {
  it("splits normalized text into tokens", () => {
    expect(tokenize("may lagnat ang sanggol")).toEqual(["may", "lagnat", "ang", "sanggol"]);
  });

  it("returns an empty array for empty input", () => {
    expect(tokenize("")).toEqual([]);
  });
});
