export type ActivityText = { en: string; fil: string };
export type FacilitatorActivity = {
  id: string;
  version: number;
  lesson_keys: string[];
  kind: "discussion" | "game" | "role-play" | "demonstration" | "practical";
  minutes: number;
  choice_group: string | null;
  optional: true;
  source_pages: number[];
  objective_indices: number[];
  title: ActivityText;
  purpose: ActivityText;
  group_size: ActivityText;
  materials: ActivityText[];
  steps: ActivityText[];
  debrief: ActivityText[];
  observe: ActivityText[];
  output: ActivityText;
  alternative: ActivityText;
  worksheet: ActivityText[];
};

export type ActivityRun = {
  id: string; session_id: string; module_id: string; activity_id: string;
  status: "planned" | "run" | "adapted" | "skipped";
  duration_minutes: number | null; note: string;
  activity_snapshot: FacilitatorActivity; recorded_at: string;
};

export const activityText = (value: ActivityText, lang: "fil" | "en") => value[lang];
export function lessonActivities(activities: FacilitatorActivity[], lessonKey: string) {
  return activities.filter((a) => a.lesson_keys.includes(lessonKey));
}
export function observationActivities(activities: FacilitatorActivity[], objective: number) {
  return activities.filter((a) => a.objective_indices.includes(objective));
}
export function activityPlan(activities: FacilitatorActivity[], selectedIds: string[], lang: "fil" | "en") {
  const selected = activities.filter((a) => selectedIds.includes(a.id));
  return {
    minutes: selected.reduce((n, a) => n + a.minutes, 0),
    materials: [...new Set(selected.flatMap((a) => a.materials.map((m) => m[lang])))],
    alternatives: [...new Set(selected.map((a) => a.choice_group).filter((g): g is string => !!g))]
      .filter((g) => selected.filter((a) => a.choice_group === g).length > 1),
  };
}
