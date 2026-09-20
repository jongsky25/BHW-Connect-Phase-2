import { UsersConsole } from "@/components/admin/users-console";
import {
  USER_PAGE_SIZE,
  pageRange,
  parseUserPage,
  sanitizeUserSearch,
  userSearchFilter,
} from "@/lib/admin/user-list";
import { createClient } from "@/lib/supabase/server";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q: rawQuery, page: rawPage } = await searchParams;
  const query = sanitizeUserSearch(rawQuery);
  const page = parseUserPage(rawPage);
  const { from, to } = pageRange(page);

  const supabase = await createClient();

  // `count: "exact"` is what makes the pager honest — it counts what RLS
  // lets this admin see, which is their scope and nothing wider.
  let usersQuery = supabase
    .from("users")
    .select(
      "id, username, full_name, role, org_unit_id, status, contact_number, email, address, org_units(name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (query) {
    usersQuery = usersQuery.or(userSearchFilter(query));
  }

  const [{ data: users, count }, { data: orgUnits }] = await Promise.all([
    usersQuery,
    supabase.from("org_units").select("id, name, level").order("name"),
  ]);

  return (
    <UsersConsole
      initialUsers={users ?? []}
      orgUnits={orgUnits ?? []}
      query={query}
      page={page}
      totalCount={count ?? 0}
      pageSize={USER_PAGE_SIZE}
    />
  );
}
