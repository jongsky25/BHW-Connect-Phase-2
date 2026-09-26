import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminNav, type AdminNavGroupView, type AdminNavLink } from "@/components/admin/admin-nav";
import { ADMIN_NAV_PREFERENCES_ITEM, visibleAdminNavGroups } from "@/lib/admin/nav";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const {
    data: { user },
  } = await getRequestAuthUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await getRequestAppUser(user.id);

  if (!appUser || appUser.role !== "admin") {
    redirect("/home");
  }

  // Tolerant of the RPC failing (e.g. the super admin migration not yet
  // applied): the link just doesn't show.
  const [flags, { data: superAdminContext }] = await Promise.all([
    getRequestFeatureFlags(),
    (await createClient()).rpc("rpc_super_admin_context"),
  ]);
  const isSuperAdmin =
    ((superAdminContext as { is_super_admin: boolean }[] | null) ?? [])[0]?.is_super_admin === true;
  const t = await getTranslations("admin.nav");

  const groups: AdminNavGroupView[] = visibleAdminNavGroups({ flags, isSuperAdmin }).map((group) => ({
    id: group.id,
    label: t(`groups.${group.id}`),
    items: group.items.map((item) => ({ key: item.key, href: item.href, label: t(item.key) })),
  }));
  const preferencesItem: AdminNavLink = {
    key: ADMIN_NAV_PREFERENCES_ITEM.key,
    href: ADMIN_NAV_PREFERENCES_ITEM.href,
    label: t(ADMIN_NAV_PREFERENCES_ITEM.key),
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:gap-8">
      <AdminNav groups={groups} preferencesItem={preferencesItem} menuLabel={t("menuLabel")} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
