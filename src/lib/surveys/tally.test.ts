import { describe, expect, it } from "vitest";
import { summarizeAnswers } from "./tally";
import type { SurveyQuestion } from "./types";

function question(overrides: Partial<SurveyQuestion>): SurveyQuestion {
  return {
    id: "q1",
    survey_id: "s1",
    position: 0,
    type: "single_choice",
    prompt_fil: "Tanong",
    prompt_en: "Question",
    options: [
      { fil: "Oo", en: "Yes" },
      { fil: "Hindi", en: "No" },
    ],
    ...overrides,
  };
}

describe("summarizeAnswers", () => {
  it("tallies single_choice answers by option index", () => {
    const result = summarizeAnswers(question({ type: "single_choice" }), [0, 0, 1]);
    expect(result.tally).toEqual({ 0: 2, 1: 1 });
    expect(result.responseCount).toBe(3);
  });

  it("tallies multi_choice answers by every selected index", () => {
    const result = summarizeAnswers(question({ type: "multi_choice" }), [
      [0, 1],
      [0],
    ]);
    expect(result.tally).toEqual({ 0: 2, 1: 1 });
  });

  it("tallies rating answers by score", () => {
    const result = summarizeAnswers(question({ type: "rating", options: [] }), [5, 4, 5]);
    expect(result.tally).toEqual({ 5: 2, 4: 1 });
  });

  it("collects text answers instead of tallying, skipping blanks", () => {
    const result = summarizeAnswers(question({ type: "text", options: [] }), [
      "Great job",
      "  ",
      "Needs more examples",
    ]);
    expect(result.tally).toEqual({});
    expect(result.textAnswers).toEqual(["Great job", "Needs more examples"]);
  });

  it("returns an empty summary for no responses", () => {
    const result = summarizeAnswers(question({}), []);
    expect(result.tally).toEqual({});
    expect(result.responseCount).toBe(0);
  });
});
