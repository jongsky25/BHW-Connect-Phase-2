import { describe, expect, it } from "vitest";
import {
  bodyIndexFromActive,
  buildNarrationZones,
  findActiveTimingIndex,
  splitIntoSentences,
  timingsMatchSection,
} from "./narration-zones";

describe("splitIntoSentences", () => {
  it("splits on ./!/? and trims whitespace", () => {
    expect(splitIntoSentences("Kumusta ka? Mabuti ako! Salamat.")).toEqual([
      "Kumusta ka?",
      "Mabuti ako!",
      "Salamat.",
    ]);
  });

  it("collapses internal whitespace/newlines before splitting", () => {
    expect(splitIntoSentences("Una.\n\nPangalawa.   Pangatlo.")).toEqual([
      "Una.",
      "Pangalawa.",
      "Pangatlo.",
    ]);
  });

  it("keeps a trailing fragment with no terminal punctuation", () => {
    expect(splitIntoSentences("Tama. Kulang ang tuldok")).toEqual([
      "Tama.",
      "Kulang ang tuldok",
    ]);
  });

  it("never drops text when punctuation is followed by a closing quote", () => {
    const text =
      'Hindi "kailan pa ba ito matatapos?" kundi "ano po ang status?" Ang malinaw na tanong ay nasasagot.';
    const sentences = splitIntoSentences(text);
    expect(sentences).toEqual([
      'Hindi "kailan pa ba ito matatapos?"',
      'kundi "ano po ang status?"',
      "Ang malinaw na tanong ay nasasagot.",
    ]);
    expect(sentences.join(" ")).toBe(text);
  });

  it("returns an empty array for blank input", () => {
    expect(splitIntoSentences("   ")).toEqual([]);
    expect(splitIntoSentences("")).toEqual([]);
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

describe("bodyIndexFromActive", () => {
  // heading, body 0, body 1, body 2, takeaway
  const zones = buildNarrationZones({
    heading: "Panimula",
    body: "Una. Pangalawa. Pangatlo.",
    takeaway: "Tandaan ito.",
  });

  it("is -1 before the first body sentence is reached", () => {
    expect(bodyIndexFromActive(zones, -1)).toBe(-1);
    expect(bodyIndexFromActive(zones, 0)).toBe(-1); // still on the heading zone
  });

  it("tracks the highest body index reached so far", () => {
    expect(bodyIndexFromActive(zones, 1)).toBe(0);
    expect(bodyIndexFromActive(zones, 2)).toBe(1);
    expect(bodyIndexFromActive(zones, 3)).toBe(2);
  });

  it("stays at the last body index once the takeaway zone is reached", () => {
    expect(bodyIndexFromActive(zones, 4)).toBe(2);
  });
});

describe("findActiveTimingIndex", () => {
  const timings = [
    { start_ms: 0 },
    { start_ms: 1000 },
    { start_ms: 2500 },
  ];

  it("returns -1 before the first timing starts", () => {
    expect(findActiveTimingIndex(timings, -1)).toBe(-1);
  });

  it("returns the last timing whose start_ms has passed", () => {
    expect(findActiveTimingIndex(timings, 0)).toBe(0);
    expect(findActiveTimingIndex(timings, 999)).toBe(0);
    expect(findActiveTimingIndex(timings, 1000)).toBe(1);
    expect(findActiveTimingIndex(timings, 2499)).toBe(1);
    expect(findActiveTimingIndex(timings, 2500)).toBe(2);
    expect(findActiveTimingIndex(timings, 9999)).toBe(2);
  });

  it("returns -1 for an empty timings array", () => {
    expect(findActiveTimingIndex([], 500)).toBe(-1);
  });
});

describe("timingsMatchSection", () => {
  const section = { heading: "Panimula", body: "Una. Pangalawa.", takeaway: "Tandaan." };
  const matchingTimings = [
    { zone: "heading" as const, index: 0, text: "Panimula", start_ms: 0, end_ms: 500 },
    { zone: "body" as const, index: 0, text: "Una.", start_ms: 500, end_ms: 900 },
    { zone: "body" as const, index: 1, text: "Pangalawa.", start_ms: 900, end_ms: 1400 },
    { zone: "takeaway" as const, index: 0, text: "Tandaan.", start_ms: 1400, end_ms: 1800 },
  ];

  it("is true when the timings were generated from this exact text", () => {
    expect(timingsMatchSection(matchingTimings, section)).toBe(true);
  });

  it("is false when the section text was edited after the audio was rendered", () => {
    const edited = { ...section, body: "Una. Pangalawa. Pangatlo." };
    expect(timingsMatchSection(matchingTimings, edited)).toBe(false);
  });

  it("is false when the zone count differs", () => {
    expect(timingsMatchSection(matchingTimings.slice(0, 2), section)).toBe(false);
  });
});
