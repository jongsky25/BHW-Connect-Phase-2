import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import type { Announcement } from "@/lib/announcements/types";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const flags = await getRequestFeatureFlags();

  if (!flags.announcements) {
    redirect("/home");
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

  const t = await getTranslations("announcements");
  const tCrumbs = await getTranslations("breadcrumbs");
  const locale = await getLocale();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, org_unit_id, author_user_id, body_fil, body_en, link_url, image_url, created_at, org_units(name), users(full_name)")
    .order("created_at", { ascending: false })
    .returns<Announcement[]>();

  const rows = announcements ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: tCrumbs("home"), href: "/home" }, { label: t("heading") }]} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("heading")}</h1>
        <p className="mt-1 text-ink/70">{t("intro")}</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} locale={locale} canModerate={false} />
          ))}
        </div>
      )}
    </div>
  );
}
