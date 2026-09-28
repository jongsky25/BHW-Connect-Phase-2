import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { VisibilityTabs } from "@/components/admin/content-visibility";
import { EmptyState } from "@/components/empty-state";
import { EntriesTable } from "@/components/kb/entries-table";
import { createClient } from "@/lib/supabase/server";

type EntryRow = {
  id: string;
  question_en: string;
  status: "draft" | "published";
  review_due_on: string | null;
  owner_user_id: string | null;
  hidden_at: string | null;
  archived_at: string | null;
  category: { name_en: string } | null;
  owner: { full_name: string } | null;
};

export default async function AdminKbEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewParam } = await searchParams;
  const view = viewParam === "archived" ? "archived" : "active";
  const supabase = await createClient();
  const t = await getTranslations("admin.kbEntries");

  const [{ data: entries }, { data: owners }] = await Promise.all([
    supabase
      .from("kb_entries")
      .select(
        "id, question_en, status, review_due_on, owner_user_id, hidden_at, archived_at, category:kb_categories(name_en), owner:users(full_name)",
      )
      .order("updated_at", { ascending: false })
      .returns<EntryRow[]>(),
    supabase.from("users").select("id, full_name, username").eq("role", "admin").order("full_name"),
  ]);

  const allRows = (entries ?? []).map((row) => ({
    id: row.id,
    question_en: row.question_en,
    status: row.status,
    review_due_on: row.review_due_on,
    owner_user_id: row.owner_user_id,
    hidden_at: row.hidden_at,
    archived_at: row.archived_at,
    category_name: row.category?.name_en ?? null,
    owner_name: row.owner?.full_name ?? null,
  }));
  const activeRows = allRows.filter((row) => !row.archived_at);
  const archivedRows = allRows.filter((row) => row.archived_at);
  const rows = view === "archived" ? archivedRows : activeRows;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("heading")}
        actions={
          <Link prefetch={false}
            href="/admin/kb/entries/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary"
          >
            {t("newAction")}
          </Link>
        }
      />

      <VisibilityTabs
        basePath="/admin/kb/entries"
        view={view}
        activeCount={activeRows.length}
        archivedCount={archivedRows.length}
      />

      {rows.length === 0 ? (
        <EmptyState message={t("empty")} actionLabel={t("newAction")} actionHref="/admin/kb/entries/new" />
      ) : (
        <EntriesTable rows={rows} owners={owners ?? []} />
      )}
    </div>
  );
}
