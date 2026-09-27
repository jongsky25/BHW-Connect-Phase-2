// RFT C2 (docs/role-feature-toggles-plan.md §4.5): the query-level half of
// content visibility. The restrictive RLS policies added in C1 already keep
// a hidden/archived row out of a plain user's reads, but two callers bypass
// RLS visibility on purpose and must filter explicitly instead: an admin's
// own reads (nothing is ever hidden from admins, plan §2 D2 — this is what
// keeps a *user-facing* page honest for them too) and, from Phase B, an
// admin previewing another user type.
//
// visible_to_users(row) = <existing publish rule> AND hidden_at IS NULL
//                          AND archived_at IS NULL

type IsFilterable<T> = {
  is(column: string, value: boolean | null): T;
};

/** Adds the two visibility filters to a Supabase query builder. */
export function withVisible<T extends IsFilterable<T>>(query: T): T {
  return query.is("hidden_at", null).is("archived_at", null);
}

/** The same rule against an already-fetched row (an embed, a cached read). */
export function isVisible(row: { hidden_at?: string | null; archived_at?: string | null }): boolean {
  return !row.hidden_at && !row.archived_at;
}
