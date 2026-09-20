export type TimeRangeKey = "7" | "30" | "90";

export type DashboardActivitySummary = {
  total_bhws: number;
  active_bhws: number;
  pct_active_bhws: number;
  avg_sessions_per_bhw: number;
  total_questions_asked: number;
};

export type DashboardBhwRow = {
  user_id: string;
  full_name: string;
  username: string;
  status: "invited" | "active" | "deactivated";
  last_login_at: string | null;
  questions_asked: number;
  // Total rows matching the query, before p_limit/p_offset — the same on
  // every row (a window function), so any row's value is the page total.
  total_count: number;
};

export type DashboardTopTopic = {
  entry_id: string;
  question_en: string;
  question_fil: string;
  match_count: number;
};

export type DashboardTrendPoint = {
  bucket_date: string;
  asked_count: number;
  answered_count: number;
  deflection_rate: number;
};

export type GapQueueRow = {
  id: string;
  text: string;
  asked_count: number;
  reason: "no_answer" | "bad_answer";
  first_asked_at: string;
  last_asked_at: string;
};
