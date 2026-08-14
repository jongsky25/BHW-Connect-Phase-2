import { describe, expect, it } from "vitest";
import { matchQuestion } from "./matcher";
import {
  ncdCorpusFixtures,
  ncdKbEntries,
  ncdOutOfScopeFixtures,
  ncdSynonyms,
  ncdUnrelatedFixtures,
  scopeBoundaryEntryIds,
} from "./ncd-fixtures";

// The MCH corpus in matcher.test.ts scores against 12 invented entries. This
// one scores against the ~130-entry HHP+ / PhilPEN corpus that kb-load.mjs
// pushes to the pilot, where every entry shares one clinical vocabulary — a
// materially harder retrieval problem, so it gets its own gate rather than
// riding on the old one.
describe("Chat Guide — HHP+ NCD corpus", () => {
  const results = ncdCorpusFixtures.map((fixture) => {
    const result = matchQuestion(fixture.question, ncdKbEntries, ncdSynonyms);
    const passed =
      fixture.expected.type === "answer"
        ? result.type === "answer" && result.top.entry.id === fixture.expected.entryId
        : result.type === fixture.expected.type;
    return { fixture, result, passed };
  });

  it("loads the published subset of the content files", () => {
    // `pending` entries are loaded as drafts and /api/chat only selects
    // published rows, so they must not be in the corpus under test.
    expect(ncdKbEntries.length).toBeGreaterThanOrEqual(120);
    expect(new Set(ncdKbEntries.map((e) => e.id)).size).toBe(ncdKbEntries.length);
    expect(ncdSynonyms.length).toBeGreaterThanOrEqual(100);
  });

  it("has at least 90 fixtures covering en, fil and taglish", () => {
    expect(ncdCorpusFixtures.length).toBeGreaterThanOrEqual(90);
    for (const language of ["en", "fil", "taglish"] as const) {
      expect(ncdCorpusFixtures.filter((f) => f.language === language).length).toBeGreaterThanOrEqual(
        30,
      );
    }
  });

  it("only expects entries that exist in the corpus", () => {
    const ids = new Set(ncdKbEntries.map((entry) => entry.id));
    const unknown = ncdCorpusFixtures
      .filter((f) => f.expected.type === "answer")
      .map((f) => (f.expected as { entryId: string }).entryId)
      .filter((id) => !ids.has(id));
    expect(unknown).toEqual([]);
  });

  it("passes at least 90% of fixtures", () => {
    const passCount = results.filter((r) => r.passed).length;
    const passRate = passCount / results.length;
    const failures = results
      .filter((r) => !r.passed)
      .map(
        (r) =>
          `${r.fixture.id} (${r.fixture.question}): expected ${JSON.stringify(r.fixture.expected)}, got ${
            r.result.type === "answer"
              ? `answer:${r.result.top.entry.id} (${r.result.top.totalScore.toFixed(2)})`
              : r.result.type
          }`,
      );
    expect(
      passRate,
      `pass rate ${(passRate * 100).toFixed(1)}%; failures:\n${failures.join("\n")}`,
    ).toBeGreaterThanOrEqual(0.9);
  });

  it("answers an out-of-scope question only with a scope-boundary entry", () => {
    const allowed = new Set(scopeBoundaryEntryIds);
    const wrong = ncdOutOfScopeFixtures
      .map((fixture) => ({
        fixture,
        result: matchQuestion(fixture.question, ncdKbEntries, ncdSynonyms),
      }))
      .filter(({ result }) => result.type === "answer" && !allowed.has(result.top.entry.id))
      .map(
        ({ fixture, result }) =>
          `${fixture.id} (${fixture.question}) -> ${result.type === "answer" ? result.top.entry.id : ""}`,
      );
    expect(
      wrong,
      `a dosing or diagnostic question was answered with a screening-technique entry:\n${wrong.join("\n")}`,
    ).toEqual([]);
  });

  it("logs an unrelated question as a gap instead of guessing", () => {
    for (const fixture of ncdUnrelatedFixtures) {
      const result = matchQuestion(fixture.question, ncdKbEntries, ncdSynonyms);
      expect(result.type, `${fixture.id}: ${fixture.question}`).toBe("no_answer");
    }
  });
});
