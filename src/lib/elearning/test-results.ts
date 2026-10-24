export type PersonalTestResult = {
  id: string; course_id: string; title_en: string; title_fil: string;
  program_id: string | null; chapter_key: string | null;
  phase: "pretest" | "posttest"; generation: "versioned" | "legacy_bhw" | "legacy_assessor";
  score_percent: number; correct_count: number | null; question_count: number | null;
  submitted_at: string; form_id: string | null; release_id: string | null; review_attempt_id: string | null;
};
export type PersonalTestHistory = { items: PersonalTestResult[]; has_more: boolean };

/** Only show a raw count when the complete frozen review agrees with the stored percentage. */
export function reviewRawScore(items: { item_id: string; correct_option_id: string }[],
  responses: { item_id: string; kind: string; option_id: string | null }[], percent: number) {
  const byId = new Map(responses.map(r => [r.item_id,r]));
  if (!items.length || byId.size !== items.length || responses.length !== items.length
    || new Set(items.map(i => i.item_id)).size !== items.length
    || items.some(i => !byId.has(i.item_id))) return null;
  if (responses.some(r => !["choice","unknown"].includes(r.kind) || (r.kind === "choice" && r.option_id === null))) return null;
  const correct = items.filter(i => byId.get(i.item_id)?.kind === "choice" && byId.get(i.item_id)?.option_id === i.correct_option_id).length;
  return Math.round(1000 * correct / items.length) / 10 === percent ? { correct, total: items.length } : null;
}
