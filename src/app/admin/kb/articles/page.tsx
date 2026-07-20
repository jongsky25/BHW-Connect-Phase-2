import { getTranslations } from "next-intl/server";
import { getAppUser } from "@/lib/auth/app-user";
import { createClient } from "@/lib/supabase/server";
import { KbNav } from "../kb-nav";
import { ArticleForm } from "./article-form";
import { ArticleStatusToggle } from "./article-status-toggle";

interface ArticleRow {
  id: string;
  title_fil: string;
  status: "draft" | "published";
  kb_categories: { name_fil: string } | null;
  owner: { full_name: string } | null;
}

export default async function AdminKbArticlesPage() {
  const t = await getTranslations("kb");
  const supabase = await createClient();

  const [{ data: categories }, { data: admins }, { data: articles }, currentUser] = await Promise.all([
    supabase.from("kb_categories").select("id, name_fil").order("sort_order"),
    supabase.from("users").select("id, full_name").eq("role", "admin").order("full_name"),
    supabase
      .from("kb_articles")
      .select("id, title_fil, status, kb_categories(name_fil), owner:users(full_name)")
      .order("created_at", { ascending: false })
      .returns<ArticleRow[]>(),
    getAppUser(supabase),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("articlesHeading")}</h1>
      <KbNav />

      <ArticleForm
        categories={categories ?? []}
        admins={admins ?? []}
        currentUserId={currentUser?.id ?? ""}
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-ink/60">
              <th className="py-2 pr-4 font-medium">{t("titleFil")}</th>
              <th className="py-2 pr-4 font-medium">{t("category")}</th>
              <th className="py-2 pr-4 font-medium">{t("owner")}</th>
              <th className="py-2 pr-4 font-medium">{t("status")}</th>
              <th className="py-2 pr-4 font-medium">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {!articles || articles.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-ink/60">
                  {t("noArticles")}
                </td>
              </tr>
            ) : (
              articles.map((article) => (
                <tr key={article.id} className="border-b border-ink/5 align-top">
                  <td className="py-2 pr-4 text-ink">{article.title_fil}</td>
                  <td className="py-2 pr-4 text-ink/70">{article.kb_categories?.name_fil ?? "—"}</td>
                  <td className="py-2 pr-4 text-ink/70">{article.owner?.full_name ?? "—"}</td>
                  <td className="py-2 pr-4 text-ink/70">
                    {article.status === "published" ? t("statusPublished") : t("statusDraft")}
                  </td>
                  <td className="py-2 pr-4">
                    <ArticleStatusToggle id={article.id} status={article.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
