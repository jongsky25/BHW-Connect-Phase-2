import { redirect } from "next/navigation";
import { UsersConsole } from "@/components/admin/users-console";
import {
  USER_PAGE_SIZE,
  pageRange,
  parseUserPage,
  sanitizeUserSearch,
  userSearchFilter,
} from "@/lib/admin/user-list";
import { loadOrgUnit } from "@/lib/org-units";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser } from "@/lib/supabase/request";

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
      "id, username, full_name, role, org_unit_id, status, contact_number, email, address, org_units(name, level)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (query) {
    usersQuery = usersQuery.or(userSearchFilter(query));
  }

  // The admin layout already guarantees a signed-in admin; their own unit is
  // the root of every placement picker on this screen.
  const {
    data: { user: authUser },
  } = await getRequestAuthUser();
  const appUser = authUser ? await getRequestAppUser(authUser.id) : null;
  if (!appUser) redirect("/login");

  const [{ data: users, count }, rootOrgUnit] = await Promise.all([
    usersQuery,
    loadOrgUnit(supabase, appUser.org_unit_id),
  ]);
  if (!rootOrgUnit) redirect("/login");

  return (
    <UsersConsole
      initialUsers={users ?? []}
      rootOrgUnit={rootOrgUnit}
      query={query}
      page={page}
      totalCount={count ?? 0}
      pageSize={USER_PAGE_SIZE}
    />
  );
}
