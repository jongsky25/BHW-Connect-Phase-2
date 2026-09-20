import { describe, expect, it } from "vitest";
import { buildNarrationZones, splitIntoSentences } from "./narration-zones.mjs";

// Mirrors src/lib/elearning/narration-zones.test.ts — the two ports must
// stay behaviorally identical (see that module's header comment).

describe("splitIntoSentences", () => {
  it("splits on ./!/? and trims whitespace", () => {
    expect(splitIntoSentences("Kumusta ka? Mabuti ako! Salamat.")).toEqual([
      "Kumusta ka?",
      "Mabuti ako!",
      "Salamat.",
    ]);
  });

  it("keeps a trailing fragment with no terminal punctuation", () => {
    expect(splitIntoSentences("Tama. Kulang ang tuldok")).toEqual([
      "Tama.",
      "Kulang ang tuldok",
    ]);
  });

  it("returns an empty array for blank input", () => {
    expect(splitIntoSentences("   ")).toEqual([]);
  });
});

describe("buildNarrationZones", () => {
  it("orders heading, then each body sentence, then takeaway", () => {
    const zones = buildNarrationZones({
      heading: "Panimula",
      body: "Una. Pangalawa.",
      takeaway: "Tandaan ito.",
    });
    expect(zones).toEqual([
      { zone: "heading", index: 0, text: "Panimula" },
      { zone: "body", index: 0, text: "Una." },
      { zone: "body", index: 1, text: "Pangalawa." },
      { zone: "takeaway", index: 0, text: "Tandaan ito." },
    ]);
  });

  it("omits a blank heading or takeaway rather than emitting an empty zone", () => {
    const zones = buildNarrationZones({ heading: "", body: "Isang pangungusap.", takeaway: "   " });
    expect(zones).toEqual([{ zone: "body", index: 0, text: "Isang pangungusap." }]);
  });
});
