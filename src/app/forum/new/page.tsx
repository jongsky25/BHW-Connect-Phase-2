import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ThreadForm } from "@/components/forum/thread-form";
import type { ForumCategory } from "@/lib/forum/types";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

export default async function NewForumThreadPage() {
  const supabase = await createClient();
  const flags = await getRequestFeatureFlags();

  if (!flags.forum) {
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

  const t = await getTranslations("forum");
  const tCrumbs = await getTranslations("breadcrumbs");

  const { data: categories } = await supabase
    .from("forum_categories")
    .select("id, slug, name_fil, name_en, description_fil, description_en, sort_order")
    .order("sort_order")
    .returns<ForumCategory[]>();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { label: tCrumbs("home"), href: "/home" },
          { label: t("heading"), href: "/forum" },
          { label: t("newThreadHeading") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("newThreadHeading")}</h1>
      <ThreadForm categories={categories ?? []} />
    </div>
  );
}
