import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { AnnouncementsConsole } from "@/components/announcements/announcements-console";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import type { Announcement } from "@/lib/announcements/types";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const flags = await getFeatureFlags(supabase);

  if (!flags.announcements) {
    redirect("/admin/users");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const appUser = await getAppUser(supabase, user.id);
  if (!appUser) {
    redirect("/login");
  }

  const locale = await getLocale();

  const [{ data: announcements }, { data: orgUnits }] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, org_unit_id, author_user_id, body_fil, body_en, link_url, image_url, created_at, org_units(name), users(full_name)")
      .order("created_at", { ascending: false })
      .returns<Announcement[]>(),
    supabase.from("org_units").select("id, name, level").order("name"),
  ]);

  return (
    <AnnouncementsConsole
      initialAnnouncements={announcements ?? []}
      orgUnits={orgUnits ?? []}
      defaultOrgUnitId={appUser.org_unit_id}
      locale={locale}
    />
  );
}
