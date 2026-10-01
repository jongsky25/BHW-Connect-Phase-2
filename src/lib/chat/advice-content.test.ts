import { describe, expect, it } from "vitest";
import module5 from "../../../content/kb/hhp-ncd/entries/module-5.json";
import sources from "../../../content/kb/hhp-ncd/sources.json";

// The "what should I tell them / what do I do next" entries for BMI and BP
// results. They sit in front of BHWs, so this is the guard on what they may
// say: no medicine names or doses (a physician's call, m1-no-medicine-decisions),
// no diagnosis wording, no remedies or slimming products, and always the
// record-it line. It reads the content files, so it holds whatever tier an
// entry is at and whenever the reviewer changes the wording.

type Entry = {
  id: string;
  question_en: string;
  question_fil: string;
  answer_en: string;
  answer_fil: string;
  keywords: string[];
  sources: string[];
};

const advice = (module5.entries as Entry[]).filter((e) =>
  e.id.startsWith("adv-"),
);

// Never appear at all: drugs and doses are a physician's decision.
const ABSOLUTE = [
  /\bmetformin\b/i,
  /\bamlodipine\b/i,
  /\blosartan\b/i,
  /\binsulin\b/i,
  /\baspirin\b/i,
  /\bmg\b/i,
  /\bmilligram/i,
  /\bdose\b/i,
  /\btablet/i,
];

// May only appear inside a sentence that tells the BHW not to say it, e.g.
// "Avoid 'wala kayong sakit'". Telling a client they do or do not have a
// condition, or promising an outcome, is what the KB says never to do.
const ONLY_AS_A_WARNING = [
  /may altapresyon (ka|kayo) na/i,
  /you have hypertension/i,
  /you are (obese|diabetic)/i,
  /wala (ka|kayong) sakit/i,
  /walang malubha/i,
  /\bcure\b/i,
  /\bgagaling\b/i,
];
const WARNING_MARKER = /\b(do not|don't|never|avoid|huwag|iwasan)\b/i;

function unwarnedClaims(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter(
      (sentence) =>
        ONLY_AS_A_WARNING.some((p) => p.test(sentence)) &&
        !WARNING_MARKER.test(sentence),
    );
}

describe("BMI and blood-pressure advice entries", () => {
  it("covers every result category the calculator can return", () => {
    expect(advice.map((e) => e.id).sort()).toEqual(
      [
        "adv-bmi-normal",
        "adv-bmi-obese",
        "adv-bmi-overweight",
        "adv-bmi-underweight",
        "adv-bp-grade-3",
        "adv-bp-high-normal",
        "adv-bp-low",
        "adv-bp-normal",
        "adv-bp-raised",
      ].sort(),
    );
  });

  it.each(advice.map((e) => [e.id, e] as const))(
    "%s is bilingual, sourced and in scope",
    (_id, entry) => {
      for (const field of [
        "question_en",
        "question_fil",
        "answer_en",
        "answer_fil",
      ] as const) {
        expect(entry[field].trim().length, field).toBeGreaterThan(40);
      }
      expect(entry.keywords.length).toBeGreaterThanOrEqual(5);
      expect(entry.sources.length).toBeGreaterThan(0);
      for (const source of entry.sources) {
        expect(Object.keys(sources.sources), source).toContain(source);
      }

      const text = `${entry.answer_en} ${entry.answer_fil}`;
      for (const pattern of ABSOLUTE) {
        expect(text, String(pattern)).not.toMatch(pattern);
      }
      expect(
        unwarnedClaims(text),
        "a claim or promise outside a warning",
      ).toEqual([]);

      // The record-it line is how the advice stays tied to the screening form.
      expect(entry.answer_en).toMatch(/record/i);
      expect(entry.answer_fil).toMatch(/itala|record/i);
    },
  );

  it("every BP entry, and the weight entries that mention products, say no medicine or remedies", () => {
    const byId = new Map(advice.map((e) => [e.id, e]));
    for (const id of [
      "adv-bp-normal",
      "adv-bp-high-normal",
      "adv-bp-raised",
      "adv-bp-grade-3",
      "adv-bp-low",
    ]) {
      expect(byId.get(id)!.answer_en, id).toMatch(
        /Do not give or advise any medicine/,
      );
      expect(byId.get(id)!.answer_fil, id).toMatch(
        /Huwag magbigay o magpayo ng anumang gamot/,
      );
    }
    for (const id of ["adv-bmi-overweight", "adv-bmi-obese"]) {
      expect(byId.get(id)!.answer_en, id).toMatch(
        /slimming products, supplements, herbal remedies/,
      );
    }
  });

  it("the guard itself catches a bare claim and a dose", () => {
    expect(unwarnedClaims("Wala kayong sakit.")).toHaveLength(1);
    expect(unwarnedClaims("Tell them you have hypertension.")).toHaveLength(1);
    expect(unwarnedClaims("Do not say 'wala kayong sakit'.")).toEqual([]);
    expect(ABSOLUTE.some((p) => p.test("Take 500 mg of metformin"))).toBe(true);
  });

  it("sends a possible emergency to the emergency steps before any routine advice", () => {
    const byId = new Map(advice.map((e) => [e.id, e]));
    expect(byId.get("adv-bp-raised")!.answer_en).toMatch(
      /^First ask whether they have chest pain/,
    );
    expect(byId.get("adv-bp-grade-3")!.answer_en).toMatch(
      /emergency steps and arrange transport now/,
    );
  });
});
