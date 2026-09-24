import { describe, expect, it } from "vitest";
import { FACILITATOR_SECTION_IDS as LOADER_IDS } from "../../../scripts/lib/reference-content.mjs";
import {
  FACILITATOR_SECTION_IDS,
  latestObservations,
  parseFacilitatorNotes,
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
});
