import { describe, expect, it } from "vitest";
import { trigramSimilarity } from "./similarity";

describe("trigramSimilarity", () => {
  it("scores identical strings as 1", () => {
    expect(trigramSimilarity("lagnat", "lagnat")).toBe(1);
  });

  it("scores completely different strings low", () => {
    expect(trigramSimilarity("lagnat", "bakuna")).toBeLessThan(0.2);
  });

  it("tolerates a single-character typo", () => {
    expect(trigramSimilarity("lagnat", "lgnat")).toBeGreaterThan(0.35);
  });

  it("treats two empty strings as identical", () => {
    expect(trigramSimilarity("", "")).toBe(1);
  });

  it("scores an empty string against a non-empty one as 0", () => {
    expect(trigramSimilarity("", "lagnat")).toBe(0);
  });
});
