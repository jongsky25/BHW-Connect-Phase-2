import { describe, expect, it } from "vitest";
import { matchQuestion } from "./matcher";
import { ncdCorpusFixtures, ncdKbEntries, ncdOutOfScopeFixtures, ncdSynonyms, ncdUnrelatedFixtures, scopeBoundaryEntryIds } from "./ncd-fixtures";
import { trainingCorpusFixtures, trainingKbEntries } from "./training-fixtures";

const combined = [...ncdKbEntries, ...trainingKbEntries];
const answerId = (question: string, entries = combined) => {
  const result = matchQuestion(question, entries, ncdSynonyms);
  return result.type === "answer" ? result.top.entry.content_id : result.type;
};

describe("Day 1 training content in the combined Chat Guide", () => {
  it("has published candidates and independent multilingual queries for all nine modules", () => {
    expect(new Set(combined.map((entry) => entry.id)).size).toBe(combined.length);
    expect(new Set(combined.map((entry) => entry.content_id)).size).toBe(combined.length);
    for (let moduleNumber = 1; moduleNumber <= 9; moduleNumber++) {
      expect(trainingKbEntries.some((e) => e.content_id?.startsWith(`d1m${moduleNumber}-`))).toBe(true);
      for (const language of ["fil", "en", "taglish"]) {
        expect(trainingCorpusFixtures.some((f) => f.id.startsWith(`day1-${moduleNumber}-`) && f.language === language)).toBe(true);
      }
    }
  });

  it("retrieves the intended training answer for at least 90% of questions", () => {
    const wrong = trainingCorpusFixtures.filter((f) => f.expected.type === "answer" && answerId(f.question) !== f.expected.entryId);
    expect(1 - wrong.length / trainingCorpusFixtures.length,
      wrong.map((f) => `${f.id}: ${f.question} -> ${answerId(f.question)}; expected ${JSON.stringify(f.expected)}`).join("\n"),
    ).toBeGreaterThanOrEqual(0.9);
  });

  it("answers the required BHW-role question from the training content", () => {
    expect(answerId("ano ang tungkulin ng BHW")).toBe("d1m1-three-roles");
  });

  it("preserves every previously passing HHP+ answer, not just its aggregate pass rate", () => {
    const baselinePasses = ncdCorpusFixtures.filter((f) => f.expected.type === "answer" && answerId(f.question, ncdKbEntries) === f.expected.entryId);
    const regressions = baselinePasses.filter((f) => f.expected.type === "answer" && answerId(f.question) !== f.expected.entryId);
    expect(regressions.map((f) => `${f.id}: ${f.question} -> ${answerId(f.question)}`)).toEqual([]);
    expect(baselinePasses.length / ncdCorpusFixtures.length).toBeGreaterThanOrEqual(0.9);
  });

  it("keeps medication/diagnosis questions inside scope boundaries", () => {
    for (const f of ncdOutOfScopeFixtures) {
      const result = matchQuestion(f.question, combined, ncdSynonyms);
      if (result.type === "answer") expect(scopeBoundaryEntryIds, f.question).toContain(result.top.entry.content_id);
    }
  });

  it("keeps unrelated questions in the gap queue", () => {
    for (const f of ncdUnrelatedFixtures) expect(answerId(f.question), f.question).toBe("no_answer");
  });
});
