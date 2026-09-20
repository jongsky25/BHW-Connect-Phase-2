import { describe, expect, it } from "vitest";
import { buildSsml, timingsFromBookmarks } from "./ssml.mjs";

describe("buildSsml", () => {
  it("places one bookmark per zone, in order, and escapes XML-sensitive text", () => {
    const zones = [
      { zone: "heading", index: 0, text: "Aling Nena's Question" },
      { zone: "body", index: 0, text: "A & B < C" },
    ];
    const ssml = buildSsml(zones, { voice: "fil-PH-BlessicaNeural", language: "fil" });

    expect(ssml).toContain('xml:lang="fil-PH"');
    expect(ssml).toContain('<voice name="fil-PH-BlessicaNeural">');
    expect(ssml).toContain("Aling Nena&apos;s Question");
    expect(ssml).toContain("A &amp; B &lt; C");
    expect(ssml.indexOf('mark="zone-0"')).toBeLessThan(ssml.indexOf('mark="zone-1"'));
  });

  it("uses en-US for the en language", () => {
    const ssml = buildSsml([{ zone: "heading", index: 0, text: "Hi" }], {
      voice: "en-US-JennyNeural",
      language: "en",
    });
    expect(ssml).toContain('xml:lang="en-US"');
  });
});

describe("timingsFromBookmarks", () => {
  it("derives each zone's [start_ms, end_ms) from consecutive bookmark offsets", () => {
    const zones = [
      { zone: "heading", index: 0, text: "Panimula" },
      { zone: "body", index: 0, text: "Una." },
      { zone: "body", index: 1, text: "Pangalawa." },
    ];
    const timings = timingsFromBookmarks(zones, [500, 1200, 2000], 2000);

    expect(timings).toEqual([
      { zone: "heading", index: 0, text: "Panimula", start_ms: 0, end_ms: 500 },
      { zone: "body", index: 0, text: "Una.", start_ms: 500, end_ms: 1200 },
      { zone: "body", index: 1, text: "Pangalawa.", start_ms: 1200, end_ms: 2000 },
    ]);
  });

  it("falls back to the total duration for the final zone if its bookmark is missing", () => {
    const zones = [{ zone: "heading", index: 0, text: "Only zone" }];
    const timings = timingsFromBookmarks(zones, [], 900);
    expect(timings).toEqual([
      { zone: "heading", index: 0, text: "Only zone", start_ms: 0, end_ms: 900 },
    ]);
  });
});
