export type FeatureFlagKey =
  | "kb_articles"
  | "reports_export"
  | "announcements"
  | "surveys"
  | "elearning"
  | "forum"
  | "flipcharts"
  | "offline_pwa"
  | "notifications";

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export type FeatureFlagRow = {
  id: string;
  key: string;
  enabled: boolean;
  description: string;
  updated_at: string;
};
