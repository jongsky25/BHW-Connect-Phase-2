import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AnnouncementsConsole } from "@/components/announcements/announcements-console";
import type { Announcement } from "@/lib/announcements/types";
import { loadOrgUnit } from "@/lib/org-units";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestMasterFlags } from "@/lib/supabase/request";

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewParam } = await searchParams;
  const view = viewParam === "archived" ? "archived" : "active";
  const supabase = await createClient();
  const flags = await getRequestMasterFlags();

  if (!flags.announcements) {
    redirect("/admin/users");
  }

  const {
    data: { user },
  } = await getRequestAuthUser();
  if (!user) {
    redirect("/login");
  }
  const appUser = await getRequestAppUser(user.id);
  if (!appUser) {
    redirect("/login");
  }

  const locale = await getLocale();

  const [{ data: announcements }, rootOrgUnit] = await Promise.all([
    supabase
      .from("announcements")
      .select(
        "id, org_unit_id, author_user_id, body_fil, body_en, link_url, image_url, created_at, hidden_at, archived_at, org_units(name), users!announcements_author_user_id_fkey(full_name)",
      )
      .order("created_at", { ascending: false })
      .returns<Announcement[]>(),
    loadOrgUnit(supabase, appUser.org_unit_id),
  ]);

  if (!rootOrgUnit) redirect("/login");

  const allRows = announcements ?? [];
  const activeRows = allRows.filter((row) => !row.archived_at);
  const archivedRows = allRows.filter((row) => row.archived_at);
  const rows = view === "archived" ? archivedRows : activeRows;

  return (
    <AnnouncementsConsole
      announcements={rows}
      view={view}
      activeCount={activeRows.length}
      archivedCount={archivedRows.length}
      rootOrgUnit={rootOrgUnit}
      locale={locale}
    />
  );
}
