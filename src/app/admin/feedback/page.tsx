import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SpotFeedbackList } from "@/components/spot-feedback/spot-feedback-list";
import { getRequestAppUser, getRequestAuthUser } from "@/lib/supabase/request";
import { loadSpotFeedback } from "@/lib/spot-feedback/query";
import { createClient } from "@/lib/supabase/server";

export default async function AdminFeedbackPage({ searchParams }: {
  searchParams: Promise<{ status?: string; page?: string; path?: string }>;
}) {
  const { data: { user } } = await getRequestAuthUser();
  if (!user) redirect("/login");
  const appUser = await getRequestAppUser(user.id);
  if (!appUser || appUser.role !== "admin") redirect("/home");
  const params = await searchParams;
  const page = Number.isSafeInteger(Number(params.page)) ? Math.max(0, Number(params.page)) : 0;
  const status = params.status ?? "";
  const pagePath = params.path?.startsWith("/") ? params.path : "";
  const { items, hasMore } = await loadSpotFeedback(await createClient(), { status, page, pagePath });
  const t = await getTranslations("spotFeedback");
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t("adminTitle")} description={t("adminIntro")} />
      <SpotFeedbackList items={items} admin status={status} pagePath={pagePath} page={page} hasMore={hasMore} />
    </div>
  );
}
