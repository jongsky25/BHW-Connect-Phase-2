import { notFound } from "next/navigation";
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

  return <ArticleForm mode="edit" article={article} categories={categories ?? []} owners={owners ?? []} />;
}
