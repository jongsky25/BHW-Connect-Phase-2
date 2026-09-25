import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";

type ArticleRow = {
  id: string;
  title_fil: string;
  title_en: string;
  status: "draft" | "published";
  review_due_on: string | null;
  category: { name_en: string } | null;
  owner: { full_name: string } | null;
};

export default async function AdminKbArticlesPage() {
  const supabase = await createClient();
  const t = await getTranslations("admin.kbArticles");

  const { data: articles } = await supabase
    .from("kb_articles")
    .select(
      "id, title_fil, title_en, status, review_due_on, category:kb_categories(name_en), owner:users(full_name)",
    )
    .order("updated_at", { ascending: false })
    .returns<ArticleRow[]>();

  const rows = articles ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
        <Link
          href="/admin/kb/articles/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary"
        >
          {t("newAction")}
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState message={t("empty")} actionLabel={t("newAction")} actionHref="/admin/kb/articles/new" />
      ) : (
        <div className="overflow-x-auto rounded-md border border-ink/10">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="bg-ink/5">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("titleEnLabel")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colCategory")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colStatus")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colOwner")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("reviewDueLabel")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-ink/10">
                  <td className="px-3 py-3 text-sm text-ink">{row.title_en}</td>
                  <td className="px-3 py-3 text-sm text-ink">{row.category?.name_en ?? "—"}</td>
                  <td className="px-3 py-3 text-sm text-ink">
                    {t(row.status === "published" ? "statusPublished" : "statusDraft")}
                  </td>
                  <td className="px-3 py-3 text-sm text-ink">{row.owner?.full_name ?? "—"}</td>
                  <td className="px-3 py-3 text-sm text-ink">{row.review_due_on ?? "—"}</td>
                  <td className="px-3 py-3 text-sm">
                    <Link
                      href={`/admin/kb/articles/${row.id}`}
                      className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5"
                    >
                      {t("editAction")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
