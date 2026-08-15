import { describe, expect, it } from "vitest";
import {
  MIN_KEYWORDS,
  buildKbDraftPrompt,
  parseKbDraft,
  parseKbDraftResponse,
} from "./kb-draft";

// A draft that should pass, so each failure case can be one field away from
// valid rather than malformed in several ways at once.
function validDraft(overrides: Record<string, unknown> = {}) {
  return {
    question_fil: "Ano ang gagawin kung mataas ang blood sugar?",
    question_en: "What should I do if the blood sugar is high?",
    answer_fil:
      "Ulitin ang pagsukat pagkatapos ng sampung minuto, itala ang resulta, at i-refer sa RHU kung mataas pa rin.",
    answer_en:
      "Repeat the reading after ten minutes, record the result, and refer to the RHU if it is still high.",
    keywords: ["blood sugar", "asukal", "mataas", "referral"],
    ...overrides,
  };
}

describe("parseKbDraft", () => {
  it("accepts a well-formed draft and trims it", () => {
    const result = parseKbDraft(validDraft({ question_en: "  What now?  " }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.question_en).toBe("What now?");
    expect(result.draft.keywords).toHaveLength(4);
  });

  // One case per malformed shape. The provider's own schema enforcement is a
  // convenience, not a guarantee — this is what actually stands between a bad
  // response and a KB entry.
  const malformed: { name: string; raw: unknown; problem: RegExp }[] = [
    { name: "null", raw: null, problem: /not an object/ },
    { name: "a bare string", raw: "sorry, I can't help with that", problem: /not an object/ },
    { name: "an array", raw: [validDraft()], problem: /missing or empty/ },
    {
      name: "a missing field",
      raw: (() => {
        const draft = validDraft() as Record<string, unknown>;
        delete draft.answer_fil;
        return draft;
      })(),
      problem: /answer_fil is missing or empty/,
    },
    { name: "an empty string field", raw: validDraft({ question_fil: "   " }), problem: /question_fil is missing or empty/ },
    { name: "a non-string field", raw: validDraft({ question_en: 42 }), problem: /question_en is missing or empty/ },
    { name: "a stub answer", raw: validDraft({ answer_en: "See a doctor." }), problem: /too short/ },
    { name: "keywords as a string", raw: validDraft({ keywords: "asukal, mataas" }), problem: /at least/ },
    { name: "no keywords at all", raw: validDraft({ keywords: [] }), problem: /at least/ },
  ];

  for (const { name, raw, problem } of malformed) {
    it(`rejects ${name}`, () => {
      const result = parseKbDraft(raw);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.problems.join(" | ")).toMatch(problem);
    });
  }

  // The rule the model does not get to shortcut. Padding a thin draft up to the
  // bar would produce an entry the matcher can barely retrieve, which is worse
  // than no entry at all: the gap stops being reported and nobody notices.
  it("rejects a draft with too few keywords rather than padding it", () => {
    const result = parseKbDraft(validDraft({ keywords: ["asukal", "mataas", "sugar"] }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toContain(`needs at least ${MIN_KEYWORDS} keywords, got 3`);
  });

  it("counts only usable keywords, so blanks cannot make up the number", () => {
    const result = parseKbDraft(validDraft({ keywords: ["asukal", "mataas", "", "  ", null] }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toContain(`needs at least ${MIN_KEYWORDS} keywords, got 2`);
  });

  it("reports every problem at once, so one round trip fixes the prompt", () => {
    const result = parseKbDraft({ question_fil: "Ano?", keywords: [] });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    // question_en, answer_fil, answer_en, keywords.
    expect(result.problems.length).toBeGreaterThanOrEqual(4);
  });
});

describe("parseKbDraftResponse", () => {
  it("parses provider JSON", () => {
    const result = parseKbDraftResponse(JSON.stringify(validDraft()));
    expect(result.ok).toBe(true);
  });

  it("reports non-JSON as a problem rather than throwing", () => {
    // A provider that ignores the response schema and replies in prose must not
    // take down the route.
    const result = parseKbDraftResponse("I'm sorry, I can't draft that.");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual(["provider did not return valid JSON"]);
  });
});

describe("buildKbDraftPrompt", () => {
  it("carries the cleared question and the scope-of-practice constraint", () => {
    const prompt = buildKbDraftPrompt("Anong gamot sa altapresyon?", []);

    expect(prompt).toContain("Anong gamot sa altapresyon?");
    expect(prompt).toMatch(/does NOT diagnose, prescribe/);
    expect(prompt).toContain(String(MIN_KEYWORDS));
  });

  it("includes related entries when there are any, and omits the section when not", () => {
    const withContext = buildKbDraftPrompt("q", ["Ano ang altapresyon?"]);
    const without = buildKbDraftPrompt("q", []);

    expect(withContext).toContain("Ano ang altapresyon?");
    expect(withContext).toContain("Existing related entries");
    expect(without).not.toContain("Existing related entries");
  });
});
