import { describe, expect, it } from "vitest";
import { chatCorpusFixtures, mockKbEntries, mockSynonyms } from "./fixtures";
import { matchQuestion } from "./matcher";

describe("matchQuestion", () => {
  it("returns an answer with related entries above the answer threshold", () => {
    const result = matchQuestion(
      "My baby has a high fever, what should I do?",
      mockKbEntries,
      mockSynonyms,
    );
    expect(result.type).toBe("answer");
    if (result.type === "answer") {
      expect(result.top.entry.id).toBe("fever-infant");
      expect(result.related.length).toBeLessThanOrEqual(2);
    }
  });

  it("returns no_answer for a question with no relevant published entries", () => {
    const result = matchQuestion("How do I renew my driver's license?", mockKbEntries, mockSynonyms);
    expect(result.type).toBe("no_answer");
  });

  it("returns no_answer when there are no entries to match against", () => {
    const result = matchQuestion("May lagnat ang sanggol", [], mockSynonyms);
    expect(result.type).toBe("no_answer");
  });
});

// §6.1 quality bar (delivery-plan.md): a checked-in corpus of >= 60
// fixtures (20 EN, 20 FIL, 20 Taglish/misspelled) with expected outcomes;
// matcher changes must keep the corpus >= 90% passing.
describe("Chat Guide fixture corpus", () => {
  const results = chatCorpusFixtures.map((fixture) => {
    const result = matchQuestion(fixture.question, mockKbEntries, mockSynonyms);
    const passed =
      fixture.expected.type === "answer"
        ? result.type === "answer" && result.top.entry.id === fixture.expected.entryId
        : result.type === fixture.expected.type;
    return { fixture, result, passed };
  });

  it("has at least 60 fixtures covering en, fil, and taglish", () => {
    expect(chatCorpusFixtures.length).toBeGreaterThanOrEqual(60);
    for (const lang of ["en", "fil", "taglish"] as const) {
      expect(chatCorpusFixtures.filter((f) => f.language === lang).length).toBeGreaterThanOrEqual(20);
    }
  });

  it("passes at least 90% of fixtures", () => {
    const passCount = results.filter((r) => r.passed).length;
    const passRate = passCount / results.length;
    const failures = results
      .filter((r) => !r.passed)
      .map((r) => `${r.fixture.id} (${r.fixture.question}): expected ${JSON.stringify(r.fixture.expected)}, got ${r.result.type}`);

    expect(passRate, `pass rate ${(passRate * 100).toFixed(1)}%; failures:\n${failures.join("\n")}`).toBeGreaterThanOrEqual(0.9);
  });
});
