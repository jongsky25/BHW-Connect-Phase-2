import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { EntriesTable } from "@/components/kb/entries-table";
import { createClient } from "@/lib/supabase/server";

type EntryRow = {
  id: string;
  question_en: string;
  status: "draft" | "published";
  review_due_on: string | null;
  owner_user_id: string | null;
  category: { name_en: string } | null;
  owner: { full_name: string } | null;
};

export default async function AdminKbEntriesPage() {
  const supabase = await createClient();
  const t = await getTranslations("admin.kbEntries");

  const [{ data: entries }, { data: owners }] = await Promise.all([
    supabase
      .from("kb_entries")
      .select(
        "id, question_en, status, review_due_on, owner_user_id, category:kb_categories(name_en), owner:users(full_name)",
      )
      .order("updated_at", { ascending: false })
      .returns<EntryRow[]>(),
    supabase.from("users").select("id, full_name, username").eq("role", "admin").order("full_name"),
  ]);

  const rows = (entries ?? []).map((row) => ({
    id: row.id,
    question_en: row.question_en,
    status: row.status,
    review_due_on: row.review_due_on,
    owner_user_id: row.owner_user_id,
    category_name: row.category?.name_en ?? null,
    owner_name: row.owner?.full_name ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
        <Link
          href="/admin/kb/entries/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-canvas"
        >
          {t("newAction")}
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState message={t("empty")} actionLabel={t("newAction")} actionHref="/admin/kb/entries/new" />
      ) : (
        <EntriesTable rows={rows} owners={owners ?? []} />
      )}
    </div>
  );
}
