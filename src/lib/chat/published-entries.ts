import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

// PostgREST caps every response at the project's max_rows (1,000 by default)
// without erroring, so a single select silently drops entries past the cap and
// the matcher never sees them. Page until the exact count is reached; advancing
// by the rows actually returned keeps this correct whatever the cap is.
export async function loadPublishedEntries(supabase: SupabaseClient, columns: string) {
  const page = (from: number) =>
    supabase
      .from("kb_entries")
      .select(columns, { count: "exact" })
      .eq("status", "published")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
  const first = await page(0);
  if (first.error) return { data: null, error: first.error };
  const rows: unknown[] = [...first.data];
  const total = first.count ?? rows.length;
  while (rows.length < total) {
    const next = await page(rows.length);
    if (next.error) return { data: null, error: next.error };
    if (!next.data.length) break;
    rows.push(...next.data);
  }
  return { data: rows, error: null };
}
