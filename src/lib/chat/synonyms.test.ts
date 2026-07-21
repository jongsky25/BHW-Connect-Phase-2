import { describe, expect, it } from "vitest";
import { normalizeText, tokenize } from "./normalize";
import { expandTokens } from "./synonyms";
import type { SynonymRow } from "./types";

const synonyms: SynonymRow[] = [
  { term: "bkit", maps_to: "bakit", language: "taglish" },
  { term: "lagnat ng baby", maps_to: "lagnat sanggol fever infant", language: "taglish" },
];

describe("expandTokens", () => {
  it("expands a single-word synonym", () => {
    const text = normalizeText("bkit mahalaga ito");
    const expanded = expandTokens(text, tokenize(text), synonyms);
    expect(expanded).toContain("bakit");
  });

  it("expands a phrase synonym found in the normalized text", () => {
    const text = normalizeText("grabe yung lagnat ng baby ko");
    const expanded = expandTokens(text, tokenize(text), synonyms);
    expect(expanded).toEqual(expect.arrayContaining(["lagnat", "sanggol", "fever", "infant"]));
  });

  it("expands in reverse when the mapped term appears instead", () => {
    const text = normalizeText("bakit importante ito");
    const expanded = expandTokens(text, tokenize(text), synonyms);
    expect(expanded).toContain("bkit");
  });

  it("leaves tokens unchanged when no synonym matches", () => {
    const text = normalizeText("walang katugma dito");
    const expanded = expandTokens(text, tokenize(text), synonyms);
    expect(expanded.sort()).toEqual(tokenize(text).sort());
  });
});
