import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AnnouncementsConsole } from "@/components/announcements/announcements-console";
import type { Announcement } from "@/lib/announcements/types";
import { loadOrgUnit } from "@/lib/org-units";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const flags = await getRequestFeatureFlags();

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
      .select("id, org_unit_id, author_user_id, body_fil, body_en, link_url, image_url, created_at, org_units(name), users(full_name)")
      .order("created_at", { ascending: false })
      .returns<Announcement[]>(),
    loadOrgUnit(supabase, appUser.org_unit_id),
  ]);

  if (!rootOrgUnit) redirect("/login");

  return (
    <AnnouncementsConsole
      initialAnnouncements={announcements ?? []}
      rootOrgUnit={rootOrgUnit}
      locale={locale}
    />
  );
}
