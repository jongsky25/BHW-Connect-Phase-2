import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ArticleForm } from "@/components/kb/article-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewKbArticlePage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: owners }] = await Promise.all([
    supabase.from("kb_categories").select("id, name_fil, name_en, slug, sort_order").order("sort_order"),
    supabase.from("users").select("id, full_name, username").eq("role", "admin").order("full_name"),
  ]);

  const t = await getTranslations("admin.kbArticles");
  const tCrumbs = await getTranslations("breadcrumbs");

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: tCrumbs("home"), href: "/home" },
          { label: t("heading"), href: "/admin/kb/articles" },
          { label: t("newAction") },
        ]}
      />
      <ArticleForm mode="create" categories={categories ?? []} owners={owners ?? []} />
    </div>
  );
}
