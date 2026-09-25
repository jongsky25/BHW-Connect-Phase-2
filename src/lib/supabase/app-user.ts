import type { SupabaseClient } from "@supabase/supabase-js";

export type AppUser = {
  id: string;
  auth_user_id: string;
  username: string;
  full_name: string;
  role: "bhw" | "admin" | "assessor" | "designer";
  org_unit_id: string;
  status: "invited" | "active" | "deactivated";
  must_change_password: boolean;
  consented_at: string | null;
  language: "fil" | "en";
  a11y_settings: unknown;
  onboarding_progress: unknown;
  onboarding_completed_at: string | null;
  notifications_last_read_at: string | null;
  /** Level of the user's org unit; a BHW not yet at "barangay" must pick one. */
  org_unit_level: string | null;
};

const APP_USER_COLUMNS =
  "id, auth_user_id, username, full_name, role, org_unit_id, status, must_change_password, consented_at, language, a11y_settings, onboarding_progress, onboarding_completed_at, notifications_last_read_at, org_units(level)";

export async function getAppUser(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select(APP_USER_COLUMNS)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  // A failed fetch here (e.g. a schema mismatch from a migration that
  // hasn't run yet) used to look identical to "no such user" and silently
  // sign every caller out. Still fail closed, but log so a regression here
  // is visible instead of presenting as an app-wide, unexplained login break.
  if (error) {
    console.error("getAppUser: failed to load app user", error);
    return null;
  }

  if (!data) return null;
  const { org_units: orgUnit, ...row } = data as Omit<AppUser, "org_unit_level"> & {
    org_units: { level: string } | { level: string }[] | null;
  };
  const unit = Array.isArray(orgUnit) ? orgUnit[0] : orgUnit;
  return { ...row, org_unit_level: unit?.level ?? null };
}
