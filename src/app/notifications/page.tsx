import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationItem } from "@/components/notifications/notification-item";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import type { Notification } from "@/lib/notifications/types";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const flags = await getFeatureFlags(supabase);

  if (!flags.notifications) {
    redirect("/home");
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

  const t = await getTranslations("notifications");
  const tCrumbs = await getTranslations("breadcrumbs");
  const locale = await getLocale();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, notification_type, title_fil, title_en, body_fil, body_en, link_path, created_at")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<Notification[]>();

  const rows = notifications ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: tCrumbs("home"), href: "/home" }, { label: t("heading") }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("heading")}</h1>
          <p className="mt-1 text-ink/70">{t("intro")}</p>
        </div>
        {rows.length > 0 ? <MarkAllReadButton /> : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
