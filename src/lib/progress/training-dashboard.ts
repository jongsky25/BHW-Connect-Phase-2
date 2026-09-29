export type TrainingDashboardRole = "bhw" | "assessor";

export type TrainingDashboardSummary = {
  role: TrainingDashboardRole;
  eligible: number;
  started: number;
  content_completed: number;
  final_completed: number;
};

export type TrainingDashboardArea = TrainingDashboardSummary & {
  id: string;
  name: string;
};

export type TrainingDashboardChapter = {
  id: string;
  chapter_key: string;
  position: number;
  title_fil: string;
  title_en: string;
  assessor_available: boolean;
};

export type TrainingDashboardPersonChapter = {
  id: string;
  chapter_key: string;
  title_fil: string;
  title_en: string;
  lesson_done: number;
  lesson_total: number;
  started: boolean;
  content_completed: boolean;
  final_completed: boolean;
  started_at: string | null;
  last_progress_at: string | null;
  content_completed_at: string | null;
  final_completed_at: string | null;
  scores: { phase: "pretest" | "posttest" | "orientation"; score_percent: number; attempted_at: string; attempts: number }[];
};

export type TrainingDashboardPerson = {
  user_id: string;
  role: TrainingDashboardRole;
  username: string;
  full_name: string;
  org_unit_id: string;
  org_unit_name: string;
  chapter_total: number;
  started: boolean;
  content_completed: boolean;
  final_completed: boolean;
  lesson_done: number;
  lesson_total: number;
  started_at: string | null;
  last_progress_at: string | null;
  content_completed_at: string | null;
  final_completed_at: string | null;
  chapters: TrainingDashboardPersonChapter[];
};

export type TrainingDashboardData = {
  summary: TrainingDashboardSummary[];
  areas: TrainingDashboardArea[];
  chapters: TrainingDashboardChapter[];
  total: number;
  people: TrainingDashboardPerson[];
};

export function completionRate(count: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  const rounded = Math.round((count / denominator) * 100);
  return count < denominator ? Math.min(rounded, 99) : 100;
}

export function progressStatus(
  progress: Pick<TrainingDashboardPerson, "started" | "content_completed" | "final_completed">,
): "not_started" | "in_progress" | "content_completed" | "final_completed" {
  if (progress.final_completed) return "final_completed";
  if (progress.content_completed) return "content_completed";
  return progress.started ? "in_progress" : "not_started";
}
