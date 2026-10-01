import { describe, expect, it } from "vitest";
import { resolveTurn } from "./conversation";
import { resolveMeasurement } from "./measurement";
import { chatCorpusFixtures } from "./fixtures";
import { gabayRetrievalCases } from "./gabay-fixtures";
import {
  ncdClarifierFixtures,
  ncdClarifiers,
  ncdCorpusFixtures,
  ncdKbEntries,
  ncdNoClarifierFixtures,
  ncdOutOfScopeFixtures,
  ncdRedFlagFixtures,
  ncdRedFlags,
  ncdSynonyms,
  ncdUnrelatedFixtures,
} from "./ncd-fixtures";
import { trainingCorpusFixtures } from "./training-fixtures";

const ask = (q: string) => resolveMeasurement(q, ncdKbEntries);
const turn = (q: string) =>
  resolveTurn(
    { question: q },
    ncdKbEntries,
    ncdSynonyms,
    ncdRedFlags,
    ncdClarifiers,
  );

type Case = {
  q: string;
  kind: "bmi" | "bp";
  outcome: string;
  urgency: string;
  en: RegExp;
  fil?: RegExp;
};

const cases: Case[] = [
  // blood pressure — English
  {
    q: "BP 118/76",
    kind: "bp",
    outcome: "result",
    urgency: "none",
    en: /optimal/,
  },
  {
    q: "BP 125/82",
    kind: "bp",
    outcome: "result",
    urgency: "none",
    en: /: normal\./,
  },
  {
    q: "what is 135/88?",
    kind: "bp",
    outcome: "result",
    urgency: "none",
    en: /high-normal/,
  },
  {
    q: "BP is 150/95, is that high?",
    kind: "bp",
    outcome: "result",
    urgency: "none",
    en: /grade 1/,
  },
  {
    q: "blood pressure 165 over 102",
    kind: "bp",
    outcome: "result",
    urgency: "none",
    en: /grade 2/,
  },
  {
    q: "reading 185/112",
    kind: "bp",
    outcome: "result",
    urgency: "attention",
    en: /grade 3.*PhilPEN/,
  },
  {
    q: "BP 150/85",
    kind: "bp",
    outcome: "result",
    urgency: "none",
    en: /isolated systolic/,
  },
  {
    q: "BP 85/55",
    kind: "bp",
    outcome: "result",
    urgency: "none",
    en: /low reading/,
  },
  // blood pressure — Filipino / Taglish
  {
    q: "presyon niya 142/92",
    kind: "bp",
    outcome: "result",
    urgency: "none",
    en: /grade 1/,
    fil: /saklaw ng altapresyon/,
  },
  {
    q: "mataas ba ang 130 sa 85 na presyon?",
    kind: "bp",
    outcome: "result",
    urgency: "none",
    en: /high-normal/,
  },
  {
    q: "BP 170/105 pero maayos ang pakiramdam",
    kind: "bp",
    outcome: "result",
    urgency: "none",
    en: /grade 2/,
  },
  {
    q: "BP 80/120",
    kind: "bp",
    outcome: "invalid",
    urgency: "none",
    en: /top number should be higher/,
  },
  {
    q: "BP 400/90",
    kind: "bp",
    outcome: "invalid",
    urgency: "none",
    en: /top number does not look right/,
  },
  // BMI
  {
    q: "BMI 62 kg 160 cm 35 years old",
    kind: "bmi",
    outcome: "result",
    urgency: "none",
    en: /BMI 24\.2.*overweight \(at risk\).*normal/,
  },
  {
    q: "BMI ko 82 kilo 1.65 m 40 taong gulang",
    kind: "bmi",
    outcome: "result",
    urgency: "none",
    en: /BMI 30\.1.*obese class II.*obese class I/,
    fil: /Kategorya ng Asia-Pacific/,
  },
  {
    q: "timbang 45 taas 160 edad 28 bmi",
    kind: "bmi",
    outcome: "result",
    urgency: "none",
    en: /BMI 17\.6.*underweight/,
  },
  {
    q: "bmi 150 lbs 5'3 age 30",
    kind: "bmi",
    outcome: "result",
    urgency: "none",
    en: /BMI 26\.6/,
  },
  {
    q: "BMI ko 62 kg",
    kind: "bmi",
    outcome: "needs_input",
    urgency: "none",
    en: /height, age/,
    fil: /taas, edad/,
  },
  {
    q: "bmi 62 kg 160 cm",
    kind: "bmi",
    outcome: "needs_input",
    urgency: "none",
    en: /age/,
  },
  {
    q: "BMI 20 kg 110 cm 8 years old",
    kind: "bmi",
    outcome: "out_of_scope",
    urgency: "none",
    en: /aged 19 and over/,
  },
  {
    q: "BMI 62 kg 160 cm 28 taong gulang buntis",
    kind: "bmi",
    outcome: "out_of_scope",
    urgency: "none",
    en: /not used in pregnancy/,
  },
  {
    q: "BMI 10 kg 160 cm 30 years old",
    kind: "bmi",
    outcome: "invalid",
    urgency: "none",
    en: /weight does not look right/,
  },
];

describe("resolveMeasurement", () => {
  it.each(cases)("$q", ({ q, kind, outcome, urgency, en, fil }) => {
    const r = ask(q);
    expect(r).not.toBeNull();
    expect(r).toMatchObject({ kind, outcome, urgency });
    expect(r!.text.en).toMatch(en);
    if (fil) expect(r!.text.fil).toMatch(fil);
  });

  it("treats a raised reading with emergency signs as an emergency and reuses the KB steps", () => {
    const r = ask("BP 160/100 sumasakit ang dibdib")!;
    expect(r.urgency).toBe("emergency");
    const emergency = ncdKbEntries.find(
      (e) => e.content_id === "m3-very-high-with-symptoms",
    )!;
    expect(r.text.en.startsWith(emergency.answer_en)).toBe(true);
    expect(r.text.fil.startsWith(emergency.answer_fil)).toBe(true);
  });

  it("does not call a high reading with only dizziness an emergency", () => {
    expect(ask("BP 150/95 nahihilo siya")!.urgency).toBe("none");
  });

  it("flags a low reading with dizziness for attention, with lie-down-and-refer wording", () => {
    const r = ask("BP 85/55 nahihilo siya")!;
    expect(r.urgency).toBe("attention");
    expect(r.text.en).toMatch(/lie them down and refer/);
  });

  it("never states the unvalidated numeric low-BP cut-off", () => {
    const r = ask("BP 85/55")!;
    expect(r.text.en).toMatch(/no agreed numeric cut-off/);
    expect(r.text.en).not.toMatch(/below 90|< ?90/);
  });

  it("always carries the screening-not-diagnosis line on a result", () => {
    for (const q of [
      "BP 150/95",
      "BP 85/55",
      "BMI 62 kg 160 cm 35 years old",
    ]) {
      expect(ask(q)!.text.en).toMatch(/not a diagnosis/);
      expect(ask(q)!.text.fil).toMatch(/hindi diagnosis/);
    }
  });

  it("offers only published related entries", () => {
    const bp = ask("BP 150/95")!;
    expect(bp.related.map((e) => e.content_id)).toEqual([
      "m3-bp-categories",
      "m3-bp-one-reading",
      "m3-bp-different-categories",
    ]);
    expect(resolveMeasurement("BP 150/95", [])!.related).toEqual([]);
  });

  it("does not hijack any existing knowledge-base question", () => {
    const questions = [
      ...ncdCorpusFixtures,
      ...chatCorpusFixtures,
      ...trainingCorpusFixtures,
      ...ncdOutOfScopeFixtures,
      ...ncdUnrelatedFixtures,
      ...ncdRedFlagFixtures,
      ...ncdClarifierFixtures,
      ...ncdNoClarifierFixtures,
    ].map((f) => f.question);
    for (const c of gabayRetrievalCases) questions.push(c.en, c.fil, c.taglish);
    expect(questions.length).toBeGreaterThan(250);
    for (const q of questions) expect(ask(q), q).toBeNull();
  });

  it("leaves questions that only mention BMI or a guideline to the KB", () => {
    for (const q of [
      "ano ang BMI?",
      "What do the BMI categories mean?",
      "Why does another guideline call 130/80 high?",
      "What blood pressure level is considered high in the Philippines?",
    ]) {
      expect(ask(q), q).toBeNull();
    }
  });
});

describe("resolveTurn with a measurement", () => {
  it("routes to measurement and never echoes the numbers into the persisted query", () => {
    const r = turn("BMI ko 62 kg 160 cm 35 taong gulang");
    expect(r.type).toBe("measurement");
    expect(r.route).toBe("measurement");
    expect(r.resolvedQuery).toBe("[bmi measurement]");
    expect(r.normalizedText).toBe("");
    expect(
      JSON.stringify({ q: r.resolvedQuery, n: r.normalizedText }),
    ).not.toMatch(/\d/);
  });

  it("keeps red-flag interception ahead of the calculator", () => {
    const r = turn("BP 150/95 at sumasakit ang dibdib niya");
    expect(r.type).toBe("answer");
    expect(r.route).toBe("red_flag");
  });

  it("still answers a guideline question from the KB", () => {
    const r = turn("Why does another guideline call 130/80 high?");
    expect(r.type).toBe("answer");
    if (r.type === "answer")
      expect(r.top.entry.content_id).toBe("m3-bp-other-guidelines");
  });
});
