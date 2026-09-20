import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ArticleForm } from "@/components/kb/article-form";
import { createClient } from "@/lib/supabase/server";

export default async function EditKbArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: article }, { data: categories }, { data: owners }] = await Promise.all([
    supabase
      .from("kb_articles")
      .select("id, category_id, title_fil, title_en, body_fil, body_en, status, owner_user_id, review_due_on, updated_at")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("kb_categories").select("id, name_fil, name_en, slug, sort_order").order("sort_order"),
    supabase.from("users").select("id, full_name, username").eq("role", "admin").order("full_name"),
  ]);

  if (!article) {
    notFound();
  }

  const t = await getTranslations("admin.kbArticles");
  const tCrumbs = await getTranslations("breadcrumbs");

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: tCrumbs("home"), href: "/home" },
          { label: t("heading"), href: "/admin/kb/articles" },
          { label: article.title_en },
        ]}
      />
      <ArticleForm mode="edit" article={article} categories={categories ?? []} owners={owners ?? []} />
    </div>
  );
}
