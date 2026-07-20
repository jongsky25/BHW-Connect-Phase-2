// Session/idle-timeout constants shared by middleware and server actions.
// Edge-safe: no Node-only imports here.

// 8-hour idle timeout, refreshed on activity (delivery-plan.md §5.1).
export const SESSION_IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000;
export const SESSION_ACTIVITY_COOKIE = "BHW_LAST_ACTIVE";

export type UserProfile = {
  id: string;
  username: string;
  full_name: string;
  role: "bhw" | "admin";
  org_unit_id: string;
  status: "invited" | "active" | "deactivated";
  must_change_password: boolean;
  consented_at: string | null;
  language: "fil" | "en";
};

export const PROFILE_SELECT_COLUMNS =
  "id, username, full_name, role, org_unit_id, status, must_change_password, consented_at, language";
