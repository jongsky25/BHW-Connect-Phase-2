import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";

/**
 * Full-privilege client that bypasses Row Level Security. Server-only:
 * the service role key must never reach the browser. Used exclusively by
 * auth server actions (login throttling, forced password change, consent,
 * audit logging) and the pilot seed script — never by request-scoped
 * user-facing reads, which should go through the RLS-enforced clients in
 * client.ts / server.ts instead.
 */
export function createServiceClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
