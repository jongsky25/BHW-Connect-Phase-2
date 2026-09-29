import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SpotFeedbackList } from "@/components/spot-feedback/spot-feedback-list";
import { getRequestAppUser, getRequestAuthUser } from "@/lib/supabase/request";
import { loadSpotFeedback } from "@/lib/spot-feedback/query";
import { createClient } from "@/lib/supabase/server";

export default async function MyFeedbackPage({ searchParams }: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { data: { user } } = await getRequestAuthUser();
  if (!user) redirect("/login");
  const appUser = await getRequestAppUser(user.id);
  if (!appUser) redirect("/login");
  const { page: rawPage } = await searchParams;
  const page = Number.isSafeInteger(Number(rawPage)) ? Math.max(0, Number(rawPage)) : 0;
  const { items, hasMore } = await loadSpotFeedback(await createClient(), { mine: appUser.id, page });
  const t = await getTranslations("spotFeedback");
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("mine")}</h1>
        <p className="mt-1 text-sm text-ink/70">{t("mineIntro")}</p>
      </div>
      <SpotFeedbackList items={items} admin={false} page={page} hasMore={hasMore} />
    </div>
  );
}
