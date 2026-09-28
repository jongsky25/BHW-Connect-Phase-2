import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { VisibilityActions, VisibilityBadge, VisibilityTabs } from "@/components/admin/content-visibility";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";

type ArticleRow = {
  id: string;
  title_fil: string;
  title_en: string;
  status: "draft" | "published";
  review_due_on: string | null;
  hidden_at: string | null;
  archived_at: string | null;
  category: { name_en: string } | null;
  owner: { full_name: string } | null;
};

export default async function AdminKbArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewParam } = await searchParams;
  const view = viewParam === "archived" ? "archived" : "active";
  const supabase = await createClient();
  const t = await getTranslations("admin.kbArticles");

  const { data: articles } = await supabase
    .from("kb_articles")
    .select(
      "id, title_fil, title_en, status, review_due_on, hidden_at, archived_at, category:kb_categories(name_en), owner:users(full_name)",
    )
    .order("updated_at", { ascending: false })
    .returns<ArticleRow[]>();

  const allRows = articles ?? [];
  const activeRows = allRows.filter((row) => !row.archived_at);
  const archivedRows = allRows.filter((row) => row.archived_at);
  const rows = view === "archived" ? archivedRows : activeRows;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("heading")}
        actions={
          <Link prefetch={false}
            href="/admin/kb/articles/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary"
          >
            {t("newAction")}
          </Link>
        }
      />

      <VisibilityTabs
        basePath="/admin/kb/articles"
        view={view}
        activeCount={activeRows.length}
        archivedCount={archivedRows.length}
      />

      {rows.length === 0 ? (
        <EmptyState message={t("empty")} actionLabel={t("newAction")} actionHref="/admin/kb/articles/new" />
      ) : (
        <div className="overflow-x-auto rounded-md border border-ink/10">
          <table className="w-full min-w-[820px] border-collapse text-left">
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
                  {t("colVisibility")}
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
                    <VisibilityBadge hidden_at={row.hidden_at} archived_at={row.archived_at} />
                  </td>
                  <td className="px-3 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Link
                        prefetch={false}
                        href={`/admin/kb/articles/${row.id}`}
                        className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5"
                      >
                        {t("editAction")}
                      </Link>
                      <VisibilityActions
                        contentType="kb_article"
                        id={row.id}
                        hidden_at={row.hidden_at}
                        archived_at={row.archived_at}
                      />
                    </div>
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
