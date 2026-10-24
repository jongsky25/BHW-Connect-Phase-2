import type { SupabaseClient } from "@supabase/supabase-js";

export async function readGreetingName(db: SupabaseClient): Promise<{ name: string | null; failed: boolean }> {
  try {
    const { data, error } = await db.rpc("rpc_my_greeting_name");
    if (error || (data !== null && typeof data !== "string")) return { name: null, failed: true };
    return { name: data, failed: false };
  } catch {
    return { name: null, failed: true };
  }
}
