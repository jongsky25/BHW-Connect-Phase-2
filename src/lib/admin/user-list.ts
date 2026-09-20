// The admin user list used to select every user in scope with no limit and
// render them all. That is unbounded by design: a city-level admin's scope
// grows with every barangay onboarded, and the e2e project already renders
// ~1,000 rows (issue #58), each carrying six action buttons. Search plus a
// page window keeps the page a fixed size no matter how large the scope gets.

export const USER_PAGE_SIZE = 25;

// PostgREST reads `or=(...)` as a comma-separated list of filters, so a term
// containing `,` `(` or `)` would change the SHAPE of the query rather than
// the text being matched. `%` `*` and `\` are LIKE wildcards/escapes, which
// would widen the match beyond what was typed. None of them mean anything in
// a username or a person's name, so they are dropped rather than escaped.
// `_` is left alone: it is a single-character wildcard, but it appears in
// real usernames and the worst case is matching slightly too much.
const POSTGREST_FILTER_CHARS = /[,()%*\\]/g;

const MAX_SEARCH_LENGTH = 80;

export function sanitizeUserSearch(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw.replace(POSTGREST_FILTER_CHARS, " ").trim().slice(0, MAX_SEARCH_LENGTH);
}

export function parseUserPage(raw: string | undefined | null): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 1 ? parsed : 1;
}

export function pageRange(page: number, size: number = USER_PAGE_SIZE): { from: number; to: number } {
  const from = (page - 1) * size;
  return { from, to: from + size - 1 };
}

export function pageCount(total: number, size: number = USER_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

// Both columns are matched so an admin can search by the username they issued
// or by the name the BHW is actually known as.
export function userSearchFilter(term: string): string {
  return `username.ilike.%${term}%,full_name.ilike.%${term}%`;
}

export function userListHref(query: string, page: number): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/admin/users?${search}` : "/admin/users";
}
