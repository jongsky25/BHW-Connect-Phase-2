import { describe, expect, it } from "vitest";
import { FACILITATOR_SECTION_IDS as LOADER_IDS } from "../../../scripts/lib/reference-content.mjs";
import {
  FACILITATOR_SECTION_IDS,
  latestObservations,
  parseFacilitatorNotes,
  summariseTestItems,
  type CompetencyObservation,
} from "./facilitator-guide";

describe("facilitator guide helpers", () => {
  it("app and loader agree on the template outline", () => {
    expect([...FACILITATOR_SECTION_IDS]).toEqual(LOADER_IDS);
  });

  it("parses template sections and keeps pre-template notes visible", () => {
    expect(parseFacilitatorNotes("## [purpose] Purpose\n\nTeach.\n\n## [steps] Steps\n\n1. Ask.\n")).toEqual([
      { id: "purpose", heading: "Purpose", body: "Teach." },
      { id: "steps", heading: "Steps", body: "1. Ask." },
    ]);
    expect(parseFacilitatorNotes("Old free-form notes.")).toEqual([{ id: "notes", heading: "", body: "Old free-form notes." }]);
    expect(parseFacilitatorNotes("")).toEqual([]);
  });

  it("latest observation per BHW and indicator wins regardless of order", () => {
    const row = (id: string, bhw: string, index: number, level: CompetencyObservation["level"], at: string): CompetencyObservation =>
      ({ id, bhw_user_id: bhw, observer_user_id: "f", module_id: "m", objective_index: index, level, note: "", observed_at: at });
    const latest = latestObservations([
      row("a", "b1", 0, "hindi_pa", "2026-09-01T00:00:00Z"),
      row("b", "b1", 0, "kaya_na", "2026-09-03T00:00:00Z"),
      row("c", "b1", 0, "kailangan_practice", "2026-09-02T00:00:00Z"),
      row("d", "b1", 1, "hindi_pa", "2026-09-01T00:00:00Z"),
    ]);
    expect(latest.get("b1:0")?.id).toBe("b");
    expect(latest.get("b1:1")?.id).toBe("d");
    expect(latest.size).toBe(2);
  });

  it("test items use each BHW's latest attempt per phase and put the hardest first", () => {
    const q = (id: string, position: number) => ({ id, position, prompt_fil: id, prompt_en: id, correct_option_index: 0,
      options: [{ fil: "tama", en: "right" }, { fil: "mali A", en: "wrong A" }, { fil: "mali B", en: "wrong B" }] });
    const a = (bhw: string, phase: "pretest" | "posttest", at: string, picks: Record<string, number>) =>
      ({ bhw_user_id: bhw, phase, taken_at: at, answers: Object.entries(picks).map(([question_id, selected_option_index]) => ({ question_id, selected_option_index })) });
    const [first, second] = summariseTestItems([q("easy", 0), q("hard", 1)], [
      a("b1", "pretest", "2026-09-01", { easy: 1, hard: 1 }),
      a("b1", "pretest", "2026-09-02", { easy: 0, hard: 2 }), // retake replaces the first pretest
      a("b2", "pretest", "2026-09-01", { easy: 0, hard: 1 }),
      a("b1", "posttest", "2026-09-05", { easy: 0, hard: 2 }),
      a("b2", "posttest", "2026-09-05", { easy: 0, hard: 0 }),
    ]);
    expect(first.question.id).toBe("hard");
    expect(first.pretest).toEqual({ answered: 2, correct: 0, percent: 0 });
    expect(first.posttest).toEqual({ answered: 2, correct: 1, percent: 50 });
    expect(first.commonWrongOption).toBe(2); // from the posttest, not the pretest's option 1
    expect(second.pretest).toEqual({ answered: 2, correct: 2, percent: 100 });
    expect(second.commonWrongOption).toBeNull();
    expect(summariseTestItems([q("x", 0)], [])[0].pretest.percent).toBeNull();
  });
});
