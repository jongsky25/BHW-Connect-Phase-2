export type KpiSummary = {
  activation_rate: number;
  wau_rate: number;
  deflection_rate: number;
  csat_rate: number;
};

export type ActivityReportColumnKey =
  | "full_name"
  | "username"
  | "status"
  | "last_login_at"
  | "questions_asked";

export type ActivityReportRow = {
  user_id: string;
  full_name: string;
  username: string;
  status: "invited" | "active" | "deactivated";
  last_login_at: string | null;
  questions_asked: number;
};
