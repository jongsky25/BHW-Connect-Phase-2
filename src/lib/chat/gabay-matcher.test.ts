import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { loadContent, reviewDueOn } from "../../../scripts/lib/kb-content.mjs";
import { matchQuestion } from "./matcher";
import { resolveTurn } from "./conversation";
import { gabayClarifiers, gabayKbEntries, gabayRetrievalCases, gabaySynonyms } from "./gabay-fixtures";
import { ncdKbEntries, ncdSynonyms } from "./ncd-fixtures";
import { trainingKbEntries } from "./training-fixtures";
import { clarifierRules, redFlagRules } from "./rules";

const corpus = [...gabayKbEntries, ...ncdKbEntries, ...trainingKbEntries];
const synonyms = [...gabaySynonyms, ...ncdSynonyms];

describe("Gabay KB and Chat Guide", () => {
  it("validates 19 bilingual, cited entries and a published-target clarifier", () => {
    const content = loadContent("philhealth-gabay");
    expect(content.entries).toHaveLength(19);
    expect(new Set(content.entries.map((entry: { id: string }) => entry.id)).size).toBe(19);
    expect(content.clarifiers).toHaveLength(1);
    expect(content.entries.every((entry: { tier: string }) => entry.tier === "cited")).toBe(true);
  });

  it("sets a short review date for changeable PhilHealth rules and blocks any nonlocal load", () => {
    const content = loadContent("philhealth-gabay");
    const clinic = content.entries.find((entry: { id: string }) => entry.id === "ph-clinic-select");
    expect(reviewDueOn(clinic, new Date("2026-09-29T00:00:00Z"))).toBe("2026-10-29");
    const loader = spawnSync(process.execPath,
      [path.join(process.cwd(), "scripts/kb-load.mjs"), "--project", "ltzicxyefizxoqhfuuzc", "--corpus", "philhealth-gabay", "--apply"],
      { encoding: "utf8" });
    expect(loader.status).toBe(1);
    expect(loader.stderr).toContain("limited to --project local");
  });

  it("retrieves at least 90% of independent English, Filipino and Taglish phrasings against existing content", () => {
    const failures: string[] = [];
    for (const fixture of gabayRetrievalCases) {
      for (const language of ["en", "fil", "taglish"] as const) {
        const result = matchQuestion(fixture[language], corpus, synonyms);
        const actual = result.type === "answer" ? result.top.entry.content_id : result.type;
        if (actual !== fixture.id) failures.push(`${fixture.id}/${language}: ${fixture[language]} -> ${actual}`);
      }
    }
    expect(1 - failures.length / (gabayRetrievalCases.length * 3), failures.join("\n")).toBeGreaterThanOrEqual(0.9);
  });

  it("clarifies vague registration and routes a selected answer by content ID", () => {
    for (const question of ["Paano magparehistro?", "How do I register for PhilHealth?", "PhilHealth registration paano?"]) {
      const result = resolveTurn({ question, context: null }, corpus, synonyms, redFlagRules, clarifierRules);
      expect(result.type, question).toBe("clarify");
      if (result.type !== "clarify") continue;
      expect(result.clarifier.id).toBe("clr-philhealth-registration-path");
      expect(result.clarifier.options).toHaveLength(2);
      const selected = resolveTurn({ selection: { clarifierId: result.clarifier.id, optionIndex: 1 }, context: null }, corpus, synonyms, redFlagRules, clarifierRules);
      expect(selected.type === "answer" && selected.top.entry.content_id).toBe("ph-clinic-select");
    }
  });

  it("uses the clue in a specific question instead of asking the clarifier again", () => {
    for (const question of ["Wala akong PIN, paano magparehistro sa PhilHealth?", "How do I register my YAKAP clinic?", "How do I correct my PhilHealth member record?"]) {
      const result = resolveTurn({ question, context: null }, corpus, synonyms, redFlagRules, clarifierRules);
      expect(result.type, question).not.toBe("clarify");
    }
  });

  it("does not turn dose, stock or record questions into a promise or credential request", () => {
    for (const [question, expected] of [
      ["What dose of GAMOT medicine should I take?", "ph-gamot-dose"],
      ["Is my GAMOT medicine in stock today?", "ph-gamot-stock"],
      ["My PhilHealth record has the wrong name", "ph-record-correction"],
    ]) {
      const result = matchQuestion(question, corpus, synonyms);
      expect(result.type === "answer" && result.top.entry.content_id, question).toBe(expected);
    }
    const credential = gabayKbEntries.find((entry) => entry.content_id === "ph-credentials");
    expect(credential?.answer_en).toContain("No.");
    expect(credential?.answer_en).not.toMatch(/send.*code/i);
  });

  it("keeps unrelated registration topics out of the PhilHealth clarifier", () => {
    for (const question of ["How do I register a birth certificate?", "How do I register for BHW Connect?"]) {
      const result = resolveTurn({ question, context: null }, corpus, synonyms, redFlagRules, clarifierRules);
      expect(result.type, question).not.toBe("clarify");
    }
    expect(gabayClarifiers[0].options.map((option) => option.entry_id)).toEqual(["ph-pin-none", "ph-clinic-select"]);
  });
});
