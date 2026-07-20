// Next.js inlines NEXT_PUBLIC_* vars into the browser bundle only when it
// sees a static `process.env.NEXT_PUBLIC_X` literal at build time — a
// dynamic `process.env[name]` lookup can't be statically analyzed, so it
// silently resolves to undefined client-side even though the var is set.
// Each getter below must reference its variable by a literal property
// access for this to work in both server and browser contexts.

export function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }
  return value;
}

export function getSupabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return value;
}
