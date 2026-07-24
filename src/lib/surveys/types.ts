export type SurveyStatus = "draft" | "published" | "closed";
export type QuestionType = "single_choice" | "multi_choice" | "rating" | "text";

export type QuestionOption = { fil: string; en: string };

export type Survey = {
  id: string;
  org_unit_id: string;
  author_user_id: string;
  title_fil: string;
  title_en: string;
  description_fil: string;
  description_en: string;
  is_anonymous: boolean;
  status: SurveyStatus;
  created_at: string;
  org_units: { name: string } | null;
};

export type SurveyQuestion = {
  id: string;
  survey_id: string;
  position: number;
  type: QuestionType;
  prompt_fil: string;
  prompt_en: string;
  options: QuestionOption[];
};

export type DraftQuestion = {
  type: QuestionType;
  prompt_fil: string;
  prompt_en: string;
  options: QuestionOption[];
};

// single_choice: option index. multi_choice: option indices. rating: 1-5.
// text: the free-text string. Options are stored/answered by index (not
// label) so either language can be shown without re-keying tallies.
export type AnswerValue = number | number[] | string;

export type QuestionResultSummary = {
  question: SurveyQuestion;
  // For single_choice/multi_choice: option index -> count. For rating:
  // 1..5 -> count. For text: not tallied, raw answers listed instead.
  tally: Record<number, number>;
  textAnswers: string[];
  responseCount: number;
};
