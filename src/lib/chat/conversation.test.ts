import { describe, expect, it } from "vitest";
import { resolveTurn } from "./conversation";
import { matchQuestion } from "./matcher";
import {
  ncdClarifierFixtures,
  ncdClarifiers,
  ncdCorpusFixtures,
  ncdKbEntries,
  ncdNoClarifierFixtures,
  ncdRedFlagFixtures,
  ncdRedFlags,
  ncdSynonyms,
} from "./ncd-fixtures";
import type { ChatContext } from "./types";

function turn(question: string, context: ChatContext | null = null) {
  return resolveTurn(
    { question, context },
    ncdKbEntries,
    ncdSynonyms,
    ncdRedFlags,
    ncdClarifiers,
  );
}

describe("red-flag interception", () => {
  it("routes every red-flag fixture to its emergency entry", () => {
    const failures: string[] = [];

    for (const fixture of ncdRedFlagFixtures) {
      const result = turn(fixture.question);
      const actual = result.type === "answer" ? result.top.entry.content_id : `(${result.type})`;
      if (actual !== fixture.expectedEntryId) {
        failures.push(`${fixture.id}: "${fixture.question}" -> ${actual}, expected ${fixture.expectedEntryId}`);
      }
    }

    expect(failures, `red-flag questions were not intercepted:\n${failures.join("\n")}`).toEqual([]);
  });

  it("intercepts even when scoring alone would confidently answer something else", () => {
    // The regression this whole layer exists for. Scored on its own, this
    // question answers with a definition of hypertension at 0.749 — above the
    // 0.55 answer threshold, so it was returned with no hedge at all.
    const question = "mataas ang presyon niya at sumasakit ang dibdib niya";

    const scoreOnly = matchQuestion(question, ncdKbEntries, ncdSynonyms);
    expect(scoreOnly.type).toBe("answer");
    expect(scoreOnly.type === "answer" && scoreOnly.top.entry.content_id).not.toBe("m3-very-high-with-symptoms");

    const resolved = turn(question);
    expect(resolved.type).toBe("answer");
    expect(resolved.type === "answer" && resolved.top.entry.content_id).toBe("m3-very-high-with-symptoms");
    expect(resolved.route).toBe("red_flag");
  });

  it("reports the entry's real score rather than a synthetic certainty", () => {
    // Scored honestly, so a red flag firing on a weak match stays visible in
    // match_score on the dashboard instead of being disguised as a 1.0.
    const result = turn("mataas ang presyon niya at sumasakit ang dibdib niya");
    expect(result.type).toBe("answer");
    if (result.type !== "answer") return;
    expect(result.top.totalScore).toBeGreaterThan(0);
    expect(result.top.totalScore).toBeLessThan(1);
  });

  it("rescues an emergency the matcher would have dropped entirely", () => {
    // "the client is unconscious" shares no vocabulary with any entry — it
    // scores 0 and the matcher returns no_answer, i.e. the BHW is told the
    // system has nothing for them at the worst possible moment.
    const question = "the client is unconscious";
    expect(matchQuestion(question, ncdKbEntries, ncdSynonyms).type).toBe("no_answer");

    const resolved = turn(question);
    expect(resolved.type).toBe("answer");
    expect(resolved.route).toBe("red_flag");
    expect(resolved.type === "answer" && resolved.top.entry.content_id).toBe("m1-emergency-not-screening");
  });

  it("names the rule that fired so the routing is auditable", () => {
    const result = turn("high blood pressure with chest pain what do I do");
    expect(result.type === "answer" && result.redFlagId).toBe("rf-bp-symptomatic");
  });

  it("does not fire on a symptom word with no screening context", () => {
    // "headache" alone is not an emergency; it needs the blood-pressure context.
    const result = turn("How do I explain a headache to a client?");
    expect(result.route).not.toBe("red_flag");
  });

  it("only ever points at published entries", () => {
    const published = new Set(ncdKbEntries.map((entry) => entry.content_id));
    for (const rule of ncdRedFlags) {
      expect(published.has(rule.entry_id), `${rule.id} -> ${rule.entry_id} is not published`).toBe(true);
    }
  });
});

describe("entry identity (INC-17b regression)", () => {
  // The bug this guards: rules name entries by content id, but the runtime
  // corpus comes from Postgres where `id` is a per-project uuid. Keying the
  // lookup on `id` made every rule miss, so the layer was inert in production
  // while the tests — which used the content files, where id *is* the content
  // id — stayed green. The fixtures now mirror production, and these two tests
  // state the invariant outright.
  it("keeps uuid ids and content ids distinct, as the database does", () => {
    for (const entry of ncdKbEntries) {
      expect(entry.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-/);
      expect(entry.content_id).not.toBe(entry.id);
      expect(entry.content_id).toBeTruthy();
    }
  });

  it("does not fire any rule against a corpus with no content ids", () => {
    // Exactly the shape a project loaded before INC-17b has: real rows, real
    // text, no content_id. The layer must degrade to plain scoring rather than
    // resolve a rule against the wrong entry.
    const unstamped = ncdKbEntries.map((entry) => ({ ...entry, content_id: null }));

    const redFlagged = resolveTurn(
      { question: "mataas ang presyon niya at sumasakit ang dibdib niya", context: null },
      unstamped,
      ncdSynonyms,
      ncdRedFlags,
      ncdClarifiers,
    );
    expect(redFlagged.route).toBe("direct");

    const clarified = resolveTurn(
      { question: "mataas ang BP niya, ano gagawin ko?", context: null },
      unstamped,
      ncdSynonyms,
      ncdRedFlags,
      ncdClarifiers,
    );
    expect(clarified.type).not.toBe("clarify");
  });
});

describe("clarifiers", () => {
  it("asks the deeper question when the decisive detail is missing", () => {
    const failures: string[] = [];

    for (const fixture of ncdClarifierFixtures) {
      const result = turn(fixture.question);
      const actual = result.type === "clarify" ? result.clarifier.id : `(${result.type})`;
      if (actual !== fixture.expectedClarifierId) {
        failures.push(`${fixture.id}: "${fixture.question}" -> ${actual}, expected ${fixture.expectedClarifierId}`);
      }
    }

    expect(failures, `under-specified questions were answered instead of clarified:\n${failures.join("\n")}`).toEqual([]);
  });

  it("does not hijack a question the KB already answers directly", () => {
    for (const fixture of ncdNoClarifierFixtures) {
      const result = turn(fixture.question);
      expect(result.type, `${fixture.id}: "${fixture.question}" was clarified`).not.toBe("clarify");
    }
  });

  it("yields to a red flag — a symptomatic client is not asked more questions", () => {
    // Names the BP topic and asks for an action, so the clarifier would match,
    // but a symptom is present: answer now, do not interrogate.
    const result = turn("mataas ang presyon at masakit ang ulo, ano gagawin ko");
    expect(result.route).toBe("red_flag");
  });

  it("does not ask the same clarifier twice in a row", () => {
    const question = "mataas ang BP niya, ano gagawin ko?";
    expect(turn(question).type).toBe("clarify");

    const repeated = turn(question, { pendingClarifierId: "clr-bp-high-next-step" });
    expect(repeated.type).not.toBe("clarify");
  });

  it("only offers options that point at published entries", () => {
    const published = new Set(ncdKbEntries.map((entry) => entry.content_id));
    for (const clarifier of ncdClarifiers) {
      expect(clarifier.options.length).toBeGreaterThanOrEqual(2);
      for (const option of clarifier.options) {
        expect(published.has(option.entry_id), `${clarifier.id} -> ${option.entry_id} is not published`).toBe(true);
      }
    }
  });
});

describe("selection", () => {
  it("resolves by entry id instead of re-asking the option text", () => {
    const clarifier = ncdClarifiers.find((item) => item.id === "clr-bp-high-next-step");
    expect(clarifier).toBeDefined();
    if (!clarifier) return;

    const optionIndex = clarifier.options.findIndex(
      (option) => option.entry_id === "m3-explain-reading",
    );
    expect(optionIndex).toBeGreaterThanOrEqual(0);

    const result = resolveTurn(
      { selection: { clarifierId: clarifier.id, optionIndex } },
      ncdKbEntries,
      ncdSynonyms,
      ncdRedFlags,
      ncdClarifiers,
    );

    expect(result.type).toBe("answer");
    expect(result.route).toBe("selection");
    expect(result.type === "answer" && result.top.entry.content_id).toBe("m3-explain-reading");
  });

  it("returns exactly the tapped entry even where re-scoring would not", () => {
    // The bug in the old chip flow: chips re-POSTed the canonical question
    // text, so the answer could differ from the option the BHW tapped.
    for (const clarifier of ncdClarifiers) {
      for (const [optionIndex, option] of clarifier.options.entries()) {
        const result = resolveTurn(
          { selection: { clarifierId: clarifier.id, optionIndex } },
          ncdKbEntries,
          ncdSynonyms,
          ncdRedFlags,
          ncdClarifiers,
        );
        expect(result.type === "answer" && result.top.entry.content_id).toBe(option.entry_id);
      }
    }
  });

  it("rejects a selection that does not exist", () => {
    const result = resolveTurn(
      { selection: { clarifierId: "clr-bp-high-next-step", optionIndex: 99 } },
      ncdKbEntries,
      ncdSynonyms,
      ncdRedFlags,
      ncdClarifiers,
    );
    expect(result.type).toBe("invalid_selection");
  });
});

describe("follow-up context", () => {
  it("matches a short follow-up against the previous topic", () => {
    const context: ChatContext = { lastContentId: "m4-site-selection" };
    const result = turn("eh kung bata?", context);

    expect(result.route).toBe("context_carry");
    expect(result.resolvedQuery).toContain("eh kung bata?");
    expect(result.resolvedQuery.length).toBeGreaterThan("eh kung bata?".length);
  });

  it("treats a fully-formed question as a new topic, not a refinement", () => {
    const context: ChatContext = { lastContentId: "m4-site-selection" };
    const result = turn("Where do I put the used lancet after the test?", context);

    expect(result.route).toBe("direct");
    expect(result.type === "answer" && result.top.entry.content_id).toBe("m4-sharps-disposal");
  });

  it("does not carry context when there is none", () => {
    expect(turn("eh kung bata?").route).toBe("direct");
  });
});

describe("baseline behaviour is preserved", () => {
  // The load-bearing regression test for this increment. It is not enough
  // that the new layer improves the emergency cases — it must not quietly
  // degrade the 90-fixture corpus the Chat Guide was accepted on. Every
  // fixture is re-scored through resolveTurn and compared against the
  // matcher's own verdict, so any rule that hijacks an ordinary question
  // fails here rather than in the field.
  it("routes the whole NCD corpus identically to the bare matcher", () => {
    const divergences: string[] = [];

    for (const fixture of ncdCorpusFixtures) {
      const baseline = matchQuestion(fixture.question, ncdKbEntries, ncdSynonyms);
      const resolved = turn(fixture.question);

      const baselineId = baseline.type === "answer" ? baseline.top.entry.content_id : `(${baseline.type})`;
      const resolvedId = resolved.type === "answer" ? resolved.top.entry.content_id : `(${resolved.type})`;

      if (baselineId !== resolvedId) {
        divergences.push(`${fixture.id}: "${fixture.question}"\n    matcher=${baselineId} conversation=${resolvedId}`);
      }
    }

    expect(
      divergences,
      `the conversation layer changed the outcome for corpus fixtures:\n${divergences.join("\n")}`,
    ).toEqual([]);
  });

  it("keeps the corpus pass rate at or above the 90% gate", () => {
    const passed = ncdCorpusFixtures.filter((fixture) => {
      if (fixture.expected.type !== "answer") return false;
      const result = turn(fixture.question);
      return result.type === "answer" && result.top.entry.content_id === fixture.expected.entryId;
    }).length;

    const passRate = passed / ncdCorpusFixtures.length;
    expect(passRate, `pass rate ${(passRate * 100).toFixed(1)}%`).toBeGreaterThanOrEqual(0.9);
  });

  it("passes ordinary questions through to the matcher unchanged", () => {
    const questions = [
      "How long should someone rest before I take their blood pressure?",
      "Aling braso ang gagamitin sa pagsukat?",
      "ano ang cbg",
      "saan ko itatapon ang nagamit na lancet",
    ];

    for (const question of questions) {
      const baseline = matchQuestion(question, ncdKbEntries, ncdSynonyms);
      const resolved = turn(question);

      expect(resolved.type).toBe(baseline.type);
      expect(resolved.route).toBe("direct");
      if (baseline.type === "answer" && resolved.type === "answer") {
        expect(resolved.top.entry.content_id).toBe(baseline.top.entry.content_id);
      }
    }
  });

  it("still refuses to guess at an unrelated question", () => {
    expect(turn("How do I renew my driver's license?").type).toBe("no_answer");
  });

  it("still answers a dosing question only with a scope-boundary entry", () => {
    const result = turn("What dose of metformin should I give for a blood sugar of 250?");
    expect(result.type === "answer" && result.top.entry.content_id).toBe("m1-no-medicine-decisions");
  });
});
