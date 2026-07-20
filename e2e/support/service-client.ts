import { createClient } from "@supabase/supabase-js";

// Deliberately not the app's src/lib/supabase/service.ts: that module is
// guarded with `import "server-only"`, which throws when imported outside
// Next.js's server bundle — including from this plain Node test process.
export function createE2EServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run this spec.");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function isSupabaseConfiguredForE2E(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
