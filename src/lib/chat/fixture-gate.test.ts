import { describe, expect, it } from "vitest";
import { chatCorpusFixtures, mockKbEntries, mockSynonyms } from "./fixtures";
import {
  gabayKbEntries,
  gabayRetrievalCases,
  gabaySynonyms,
} from "./gabay-fixtures";
import { matchQuestion } from "./matcher";
import { ncdCorpusFixtures, ncdKbEntries, ncdSynonyms } from "./ncd-fixtures";
import { trainingCorpusFixtures, trainingKbEntries } from "./training-fixtures";
import type { ChatEntryCandidate, SynonymRow } from "./types";

// The per-corpus tests only require >= 90% of fixtures to pass, which lets one
// bad entry quietly steal one question: 'ok lang ba mag round ng bp reading'
// went to m3-bp-one-reading instead of m3-rounding and stayed green. This is
// the ratchet on top of those gates: EVERY retrieval fixture must pass on its
// own, except the ones listed below.
//
// KNOWN_FAILURES is the set that was already failing when this gate was added
// (1 Oct 2026). It may only shrink: fix the entry's keywords (or correct the
// fixture) and delete the id. A new failing fixture fails here by name, and so
// does an allow-listed id that now passes, so the list cannot go stale.
const KNOWN_FAILURES = {
  mch: ["en-12"],
  ncd: [] as string[],
  training: ["day1-1-taglish-2"],
  gabay: ["ph-yakap-first-visit/taglish"],
};

type Outcome = { id: string; question: string; expected: string; got: string };

function failures(
  fixtures: Array<{
    id: string;
    question: string;
    expected: { type: string; entryId?: string };
  }>,
  entries: ChatEntryCandidate[],
  synonyms: SynonymRow[],
  key: "id" | "content_id",
): Outcome[] {
  return fixtures.flatMap((f) => {
    const result = matchQuestion(f.question, entries, synonyms);
    const got =
      result.type === "answer"
        ? ((result.top.entry[key] as string | null) ?? "(no id)")
        : result.type;
    const expected =
      f.expected.type === "answer"
        ? (f.expected.entryId as string)
        : f.expected.type;
    return got === expected
      ? []
      : [{ id: f.id, question: f.question, expected, got }];
  });
}

function gabayFailures(): Outcome[] {
  const corpus = [...gabayKbEntries, ...ncdKbEntries, ...trainingKbEntries];
  const synonyms = [...gabaySynonyms, ...ncdSynonyms];
  const out: Outcome[] = [];
  for (const c of gabayRetrievalCases) {
    for (const language of ["en", "fil", "taglish"] as const) {
      const result = matchQuestion(c[language], corpus, synonyms);
      const got =
        result.type === "answer"
          ? (result.top.entry.content_id ?? "(no id)")
          : result.type;
      if (got !== c.id)
        out.push({
          id: `${c.id}/${language}`,
          question: c[language],
          expected: c.id,
          got,
        });
    }
  }
  return out;
}

const corpora: Array<{
  name: keyof typeof KNOWN_FAILURES;
  run: () => Outcome[];
}> = [
  {
    name: "mch",
    run: () => failures(chatCorpusFixtures, mockKbEntries, mockSynonyms, "id"),
  },
  {
    name: "ncd",
    run: () =>
      failures(ncdCorpusFixtures, ncdKbEntries, ncdSynonyms, "content_id"),
  },
  {
    name: "training",
    run: () =>
      failures(
        trainingCorpusFixtures,
        [...ncdKbEntries, ...trainingKbEntries],
        ncdSynonyms,
        "content_id",
      ),
  },
  { name: "gabay", run: gabayFailures },
];

describe("every retrieval fixture passes on its own", () => {
  for (const { name, run } of corpora) {
    const failing = run();
    const known = new Set(KNOWN_FAILURES[name]);

    it(`${name}: no fixture fails that is not already known`, () => {
      const unexpected = failing
        .filter((f) => !known.has(f.id))
        .map(
          (f) =>
            `${f.id}: "${f.question}" expected ${f.expected}, got ${f.got}`,
        );
      expect(
        unexpected,
        "a retrieval fixture now fails; fix the entry's keywords or the fixture",
      ).toEqual([]);
    });

    it(`${name}: every known failure still fails (remove the ones that now pass)`, () => {
      const stillFailing = new Set(failing.map((f) => f.id));
      const stale = [...known].filter((id) => !stillFailing.has(id));
      expect(stale, "these are fixed: delete them from KNOWN_FAILURES").toEqual(
        [],
      );
    });
  }

  it("the HHP+ corpus, where the BMI and blood-pressure entries live, has no exceptions at all", () => {
    expect(KNOWN_FAILURES.ncd).toEqual([]);
  });
});
