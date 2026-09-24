// Facilitator guide helpers. Only ever used on assessor/admin paths: the
// notes they parse come from course_lesson_facilitator_notes and
// course_module_facilitator_notes, which RLS withholds from BHWs.

// Fixed outline of every lesson's facilitator notes. Mirrors
// FACILITATOR_SECTION_IDS in scripts/lib/reference-content.mjs, which the
// loader enforces; facilitator-guide.test.ts keeps the two in step.
export const FACILITATOR_SECTION_IDS = [
  "purpose",
  "time-materials",
  "prepare",
  "opening",
  "steps",
  "expected-answers",
  "misconception",
  "practice",
  "answer-key",
  "observe",
  "support",
  "sources-review",
] as const;

export type FacilitatorSectionId = (typeof FACILITATOR_SECTION_IDS)[number];
export type FacilitatorSection = { id: string; heading: string; body: string };

// Parses `## [id] Heading` sections. Notes published before the template
// existed have no such headings; they come back as one untitled section so
// they still render rather than disappear.
export function parseFacilitatorNotes(markdown: string): FacilitatorSection[] {
  const sections: FacilitatorSection[] = [];
  let current: FacilitatorSection | null = null;
  const loose: string[] = [];
  for (const line of markdown.replaceAll("\r", "").split("\n")) {
    const match = /^## \[([a-z0-9][a-z0-9-]*)\] (.+)$/.exec(line);
    if (match) {
      current = { id: match[1], heading: match[2], body: "" };
      sections.push(current);
    } else if (current) current.body += line + "\n";
    else loose.push(line);
  }
  const lead = loose.join("\n").trim();
  return [
    ...(lead ? [{ id: "notes", heading: "", body: lead }] : []),
    ...sections.map((s) => ({ ...s, body: s.body.trim() })),
  ].filter((s) => s.body);
}

export const OBSERVATION_LEVELS = ["kaya_na", "kailangan_practice", "hindi_pa"] as const;
export type ObservationLevel = (typeof OBSERVATION_LEVELS)[number];

export const OBSERVATION_LEVEL_LABELS: Record<ObservationLevel, { fil: string; en: string }> = {
  kaya_na: { fil: "Kaya na", en: "Kaya na (can do)" },
  kailangan_practice: { fil: "Kailangan pa ng practice", en: "Kailangan pa ng practice (needs practice)" },
  hindi_pa: { fil: "Hindi pa", en: "Hindi pa (not yet)" },
};

export type CompetencyObservation = {
  id: string;
  bhw_user_id: string;
  observer_user_id: string;
  module_id: string;
  objective_index: number;
  level: ObservationLevel;
  note: string;
  observed_at: string;
};

// Rows are append-only history; the newest row per BHW and indicator is the
// current rating. Input order does not matter.
export function latestObservations(rows: CompetencyObservation[]) {
  const latest = new Map<string, CompetencyObservation>();
  for (const row of rows) {
    const key = `${row.bhw_user_id}:${row.objective_index}`;
    const seen = latest.get(key);
    if (!seen || seen.observed_at < row.observed_at) latest.set(key, row);
  }
  return latest;
}
