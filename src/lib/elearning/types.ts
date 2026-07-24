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
