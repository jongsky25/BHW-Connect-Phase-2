import type { SupabaseClient } from "@supabase/supabase-js";

export interface AppUser {
  id: string;
  auth_user_id: string;
  username: string;
  full_name: string;
  role: "bhw" | "admin";
  org_unit_id: string;
  status: "invited" | "active" | "deactivated";
  must_change_password: boolean;
  consented_at: string | null;
  language: "fil" | "en";
}

// Resolves the calling session's app-profile row via the SECURITY DEFINER
// current_app_user() RPC (bypasses the users RLS policy's self-lookup
// recursion). Returns null when there's no session or no matching profile.
export async function getAppUser(supabase: SupabaseClient): Promise<AppUser | null> {
  const { data, error } = await supabase.rpc("current_app_user");
  if (error || !data) {
    return null;
  }
  return data as AppUser;
}
