export type FeatureFlagKey =
  | "kb_articles"
  | "reports_export"
  | "announcements"
  | "surveys"
  | "elearning"
  | "forum"
  | "offline_pwa";

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export type FeatureFlagRow = {
  id: string;
  key: string;
  enabled: boolean;
  description: string;
  updated_at: string;
};
