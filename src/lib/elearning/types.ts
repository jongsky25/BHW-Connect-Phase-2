export type CourseStatus = "draft" | "published" | "archived";
export type ModuleType = "text" | "video" | "quiz";

// Reference Manual additive hierarchy. Legacy Course/Module/Lesson types below
// remain unchanged until an explicitly mapped, published experience is enabled.
export type TrainingProgram = {
  id: string; content_key: string; org_unit_id: string; author_user_id: string;
  title_fil: string; title_en: string; description_fil: string; description_en: string;
  status: CourseStatus; created_at: string; updated_at: string;
};
export type TrainingProgramChapter = {
  id: string; program_id: string; chapter_key: string; position: number;
  title_fil: string; title_en: string; course_id: string | null;
  availability: "unavailable" | "available";
};
export type CourseLesson = {
  id: string; module_id: string; lesson_key: string; position: number;
  title_fil: string; title_en: string; objectives_fil: string[]; objectives_en: string[];
  required: boolean; published_revision_id: string | null; created_at: string;
};
export type LessonModality = "read" | "slides";
export type StableLessonSection = {
  id: string; concept_ids: string[]; heading_fil: string; heading_en: string;
  body_fil: string; body_en: string; asset_ids: string[];
  takeaway_fil: string; takeaway_en: string; check: LessonCheck | null;
};
export type AuthoredLessonSlide = {
  id: string; concept_ids: string[];
  layout: "scene" | "annotated-illustration" | "comparison" | "process" | "relationship-map" | "decision" | "takeaway";
  heading_fil: string; heading_en: string; display_fil: string; display_en: string;
  asset_ids: string[]; check: LessonCheck | null;
  narration_fil?: string; narration_en?: string;
};
export type LessonSource = { id: string; title: string; pdf_pages: number[]; url?: string };
export type LessonAsset = {
  content_hash: string;
  id: string; path: string; alt_fil: string; alt_en: string;
  caption_fil: string; caption_en: string; provenance: string;
  review_status: "draft" | "approved";
};
export type LessonConceptCoverage = { id: string; read_ids: string[]; slide_ids: string[]; source_ids: string[] };
export type CourseLessonRevision = {
  id: string; lesson_id: string; revision_key: string; content_hash: string;
  read_sections: StableLessonSection[]; slides: AuthoredLessonSlide[];
  coverage: LessonConceptCoverage[]; sources: LessonSource[]; assets: LessonAsset[];
  created_by: string; created_at: string;
};
export type CourseLessonProgress = {
  course_progress_id: string; lesson_id: string; revision_id: string; completed_at: string;
} & (
  | { completion_basis: "learner"; legacy_module_id: null; migration_batch: null }
  | { completion_basis: "legacy_equivalence"; legacy_module_id: string; migration_batch: string }
);
export type CourseLessonResume = {
  course_progress_id: string; lesson_id: string; revision_id: string;
  modality: LessonModality; language: "fil" | "en";
  position_key: string; concept_id: string; updated_at: string;
};
// Fetch only on an assessor/admin path. Never nest in CourseLessonRevision.
export type CourseLessonFacilitatorNotes = {
  revision_id: string; notes_fil: string; notes_en: string;
  observation_indicators: ObservationIndicator[];
};

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
  // §C.2 — which coverage.json concepts this section delivers. Authored as a
  // "{id, id}" marker on the heading and checked by the loader; carried into
  // the row so a deployed lesson can still be audited against its sources.
  // Absent on modules authored before the coverage rule.
  concept_ids?: string[];
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

// INC-27 audio narration + read-along. Pre-rendered at content-load time
// by scripts/tts-render.mjs, never at runtime (see that script's header).
// `timings` is an ordered, flat list spanning the whole section's narrated
// text in playback order (heading, then each body sentence, then
// takeaway) — the same order src/lib/elearning/narration-zones.ts builds
// from a section's text, which is what lets the renderer line each
// timing up with the span it should highlight.
export type NarrationLanguage = "fil" | "en";
export type NarrationZoneKind = "heading" | "body" | "takeaway";

export type LessonAudioTiming = {
  zone: NarrationZoneKind;
  // 0 for heading/takeaway (each a single unit); the sentence's index
  // within the body for "body".
  index: number;
  text: string;
  start_ms: number;
  end_ms: number;
};

export type CourseModuleAudio = {
  id: string;
  module_id: string;
  // Position in the module's FULL authored lesson.sections array — not an
  // index into whatever subset the current lesson_density renders (§A.6).
  section_index: number;
  language: NarrationLanguage;
  audio_url: string;
  format: "opus" | "mp3";
  duration_seconds: number;
  content_hash: string;
  timings: LessonAudioTiming[];
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

// INC-23 facilitator UI (docs/training-modules-plan.md). course_sessions is
// the facilitator-owned wrapper INC-19 added around a course; status starts
// 'scheduled' (the only status lesson_density stays editable in — see
// rpc_course_session_set_density) and moves to 'completed'/'cancelled'.
export type SessionStatus = "scheduled" | "completed" | "cancelled";

export type CourseSession = {
  id: string;
  course_id: string;
  org_unit_id: string;
  facilitator_user_id: string;
  scheduled_at: string;
  location_note: string;
  lesson_density: LessonDensity;
  status: SessionStatus;
  created_at: string;
  courses: { title_fil: string; title_en: string } | null;
};

export type EnrollmentStatus = "enrolled" | "attended" | "no_show";

export type CourseSessionEnrollment = {
  id: string;
  session_id: string;
  bhw_user_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  users: { full_name: string; username: string } | null;
};

// 20260927000000_facilitation_log.sql: one subchapter delivered in a session.
export type CourseSessionDelivery = {
  id: string;
  session_id: string;
  module_id: string;
  duration_minutes: number;
  notes: string;
  recorded_at: string;
};

// Facilitator's own-scope BHW picker (mirrors AdminUserRow's shape, trimmed
// to what the enroll picker needs).
export type BhwOption = {
  id: string;
  full_name: string;
  username: string;
  org_units: { name: string } | null;
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
