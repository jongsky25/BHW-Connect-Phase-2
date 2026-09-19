export type CourseStatus = "draft" | "published" | "archived";
export type ModuleType = "text" | "video" | "quiz";

export type QuizOption = { fil: string; en: string };

export type Course = {
  id: string;
  org_unit_id: string;
  author_user_id: string;
  title_fil: string;
  title_en: string;
  description_fil: string;
  description_en: string;
  status: CourseStatus;
  quiz_passing_percent: number;
  quiz_max_attempts: number;
  created_at: string;
  org_units: { name: string } | null;
};

export type CourseModule = {
  id: string;
  course_id: string;
  position: number;
  type: ModuleType;
  title_fil: string;
  title_en: string;
  body_fil: string;
  body_en: string;
  video_url: string | null;
  objectives_fil: string[];
  objectives_en: string[];
  summary_fil: string;
  summary_en: string;
  lesson: Lesson | null;
};

// §A.5 retrieval practice: authored inline, never persisted — no attempt
// row, nothing scored, nothing gated.
export type LessonCheck = {
  prompt_fil: string;
  prompt_en: string;
  options: QuizOption[];
  correct_option_index: number;
  feedback_fil: string;
  feedback_en: string;
};

// §A.6: facilitator-set lesson density, purely additive — nothing is
// rewritten per density, only shown or hidden.
export type LessonTier = "core" | "standard" | "deep";
export type LessonDensity = "short" | "normal" | "long";

export const TIERS_FOR_DENSITY: Record<LessonDensity, LessonTier[]> = {
  short: ["core"],
  normal: ["core", "standard"],
  long: ["core", "standard", "deep"],
};

export type LessonSectionKind = "scenario" | "concept" | "contrast" | "practice";

export type LessonSection = {
  kind: LessonSectionKind;
  tier: LessonTier; // §A.6 — core sections alone must cover every objective
  heading_fil: string;
  heading_en: string;
  body_fil: string;
  body_en: string;
  visual_position: number | null; // -> course_module_visuals.position
  takeaway_fil: string;
  takeaway_en: string;
  check: LessonCheck | null;
};

export type Lesson = {
  sections: LessonSection[];
};

// §D visual primitives.
export type VisualPrimitive = "hub-spoke" | "chain" | "contrast" | "map" | "tree" | "stack" | "image";

export type CourseModuleVisual = {
  id: string;
  module_id: string;
  position: number;
  primitive: VisualPrimitive;
  svg_markup: string | null;
  image_url: string | null;
  caption_fil: string;
  caption_en: string;
  alt_text_fil: string;
  alt_text_en: string;
  tier: LessonTier;
};

// §A.4 facilitator/assessor competency guide. RLS keeps this table away
// from `bhw` entirely — never read it from a BHW-facing code path.
export type ObservationLevels = {
  kaya_na_fil: string;
  kaya_na_en: string;
  kailangan_practice_fil: string;
  kailangan_practice_en: string;
  hindi_pa_fil: string;
  hindi_pa_en: string;
};

export type ObservationIndicator = {
  objective_index: number;
  observable_fil: string;
  observable_en: string;
  not_yet_fil: string;
  not_yet_en: string;
  levels: ObservationLevels;
};

export type CourseModuleFacilitatorNotes = {
  id: string;
  module_id: string;
  notes_fil: string;
  notes_en: string;
  competency_statement_fil: string;
  competency_statement_en: string;
  observation_indicators: ObservationIndicator[];
};

export type QuizQuestion = {
  id: string;
  module_id: string;
  position: number;
  prompt_fil: string;
  prompt_en: string;
  options: QuizOption[];
  correct_option_index: number;
};

// INC-19 course-level shared pretest/posttest bank (course_test_questions) —
// same shape as QuizQuestion minus module_id, since this is scoped to the
// course, not a single module.
export type CourseTestQuestion = {
  id: string;
  course_id: string;
  position: number;
  prompt_fil: string;
  prompt_en: string;
  options: QuizOption[];
  correct_option_index: number;
};

export type TestPhase = "pretest" | "posttest";

export type CourseTestAttempt = {
  id: string;
  course_id: string;
  session_id: string | null;
  phase: TestPhase;
  score_percent: number;
  taken_at: string;
};

export type DraftQuizQuestion = {
  prompt_fil: string;
  prompt_en: string;
  options: QuizOption[];
  correct_option_index: number;
};

export type DraftModule = {
  type: ModuleType;
  title_fil: string;
  title_en: string;
  body_fil: string;
  body_en: string;
  video_url: string;
  questions: DraftQuizQuestion[];
};

export type CourseProgressStatus = "in_progress" | "content_completed" | "certified" | "failed_assessment";

export type ModuleProgress = {
  module_id: string;
  completed_at: string | null;
  quiz_score: number | null;
  quiz_attempts: number;
};

export type AssessmentStatus = "pending" | "assigned" | "passed" | "failed";

export type Assessment = {
  id: string;
  course_id: string;
  bhw_user_id: string;
  org_unit_id: string;
  status: AssessmentStatus;
  assessor_user_id: string | null;
  notes: string;
  created_at: string;
  decided_at: string | null;
  courses: { title_fil: string; title_en: string } | null;
  users: { full_name: string; username: string } | null;
};
