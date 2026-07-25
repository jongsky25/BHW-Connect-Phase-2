import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ThreadForm } from "@/components/forum/thread-form";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import type { ForumCategory } from "@/lib/forum/types";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

export default async function NewForumThreadPage() {
  const supabase = await createClient();
  const flags = await getFeatureFlags(supabase);

  if (!flags.forum) {
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

  const t = await getTranslations("forum");

  const { data: categories } = await supabase
    .from("forum_categories")
    .select("id, slug, name_fil, name_en, description_fil, description_en, sort_order")
    .order("sort_order")
    .returns<ForumCategory[]>();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("newThreadHeading")}</h1>
      <ThreadForm categories={categories ?? []} />
    </div>
  );
}
