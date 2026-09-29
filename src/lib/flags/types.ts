import type { AppRole } from "@/lib/auth/roles";

export type FeatureFlagKey =
  | "kb_articles"
  | "reports_export"
  | "announcements"
  | "surveys"
  | "elearning"
  | "course_sessions"
  | "forum"
  | "flipcharts"
  | "offline_pwa"
  | "notifications"
  | "chat_conversation"
  | "ai_external"
  | "ai_gap_draft"
  | "spot_feedback";

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export type FeatureFlagRow = {
  id: string;
  key: string;
  enabled: boolean;
  description: string;
  disabled_roles: AppRole[];
  org_unit_filter: string | null;
  updated_at: string;
};

// Which user types each flag can be toggled for (docs/role-feature-toggles-plan.md
// §4.3). Mirrors flag_role_scope() in
// supabase/migrations/20261005000100_rft_a1_flag_roles.sql — keep the two in
// sync; flag-role-scope.test.ts checks it. A flag missing here, or mapped to
// an empty array, can only be changed through its master "Available" switch:
// admin-console-only and system flags (reports_export, ai_gap_draft,
// ai_external) have no per-type switch at all.
export const FLAG_ROLE_SCOPE: Record<FeatureFlagKey, AppRole[]> = {
  kb_articles: ["bhw", "assessor", "designer"],
  reports_export: [],
  announcements: ["bhw", "assessor", "designer"],
  surveys: ["bhw", "assessor", "designer"],
  elearning: ["bhw", "assessor"],
  course_sessions: ["bhw", "assessor"],
  forum: ["bhw", "assessor", "designer"],
  flipcharts: ["bhw", "designer"],
  offline_pwa: ["bhw", "assessor", "designer"],
  notifications: ["bhw", "assessor", "designer"],
  chat_conversation: ["bhw", "assessor", "designer"],
  ai_external: [],
  ai_gap_draft: [],
  spot_feedback: ["bhw", "assessor", "designer"],
};
