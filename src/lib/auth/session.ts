import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface CurrentAppUser {
  id: string;
  username: string;
  full_name: string;
  role: "bhw" | "admin";
  org_unit_id: string;
  status: "invited" | "active" | "deactivated";
  must_change_password: boolean;
  consented_at: string | null;
}

// Uses the RLS-scoped client, not the service role: relies on the "users
// can read their own row" policy (INC-1 migration), so it can only ever
// return the signed-in user's own profile.
export async function getCurrentAppUser(): Promise<CurrentAppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("users")
    .select("id, username, full_name, role, org_unit_id, status, must_change_password, consented_at")
    .eq("auth_user_id", user.id)
    .single();

  return data;
}
