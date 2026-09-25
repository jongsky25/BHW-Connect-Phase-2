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
  activity_snapshot?: import("./activities").FacilitatorActivity | null;
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

// Where BHWs in the viewer's area struggle on the chapter test. Uses each
// BHW's latest attempt per phase, so a retake replaces an earlier answer
// rather than counting twice.
export type TestItemQuestion = { id: string; position: number; prompt_fil: string; prompt_en: string; options: Array<{ fil: string; en: string }>; correct_option_index: number };
export type TestItemAttempt = { bhw_user_id: string; phase: "pretest" | "posttest"; taken_at: string; answers: Array<{ question_id: string; selected_option_index: number }> | null };
export type PhaseStat = { answered: number; correct: number; percent: number | null };
export type TestItemStat = { question: TestItemQuestion; pretest: PhaseStat; posttest: PhaseStat; commonWrongOption: number | null };

export function summariseTestItems(questions: TestItemQuestion[], attempts: TestItemAttempt[]): TestItemStat[] {
  const latest = new Map<string, TestItemAttempt>();
  for (const a of attempts) {
    const key = `${a.bhw_user_id}:${a.phase}`;
    const seen = latest.get(key);
    if (!seen || seen.taken_at < a.taken_at) latest.set(key, a);
  }
  const stat = (answered: number, correct: number): PhaseStat => ({ answered, correct, percent: answered ? Math.round((correct / answered) * 100) : null });
  return questions
    .map((question) => {
      const counts = { pretest: [0, 0], posttest: [0, 0] };
      const wrong = { pretest: new Map<number, number>(), posttest: new Map<number, number>() };
      for (const a of latest.values()) {
        const answer = a.answers?.find((x) => x.question_id === question.id);
        if (!answer) continue;
        const ok = answer.selected_option_index === question.correct_option_index;
        counts[a.phase][0] += 1;
        if (ok) counts[a.phase][1] += 1;
        else wrong[a.phase].set(answer.selected_option_index, (wrong[a.phase].get(answer.selected_option_index) ?? 0) + 1);
      }
      // The misconception to address now: posttest answers once there are any.
      const phase = counts.posttest[0] ? "posttest" : "pretest";
      const common = [...wrong[phase].entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0])[0];
      return {
        question,
        pretest: stat(counts.pretest[0], counts.pretest[1]),
        posttest: stat(counts.posttest[0], counts.posttest[1]),
        commonWrongOption: common ? common[0] : null,
      };
    })
    // Hardest first: the most recent phase with answers decides.
    .sort((a, b) => (a.posttest.percent ?? a.pretest.percent ?? 101) - (b.posttest.percent ?? b.pretest.percent ?? 101) || a.question.position - b.question.position);
}
