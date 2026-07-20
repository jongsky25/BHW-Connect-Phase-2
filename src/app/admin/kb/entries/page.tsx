import { getTranslations } from "next-intl/server";
import { getAppUser } from "@/lib/auth/app-user";
import { createClient } from "@/lib/supabase/server";
import { KbNav } from "../kb-nav";
import { EntryForm } from "./entry-form";
import { EntryStatusToggle } from "./entry-status-toggle";

interface EntryRow {
  id: string;
  question_fil: string;
  status: "draft" | "published";
  image_url: string | null;
  kb_categories: { name_fil: string } | null;
  owner: { full_name: string } | null;
}

export default async function AdminKbEntriesPage() {
  const t = await getTranslations("kb");
  const supabase = await createClient();

  const [{ data: categories }, { data: admins }, { data: entries }, currentUser] = await Promise.all([
    supabase.from("kb_categories").select("id, name_fil").order("sort_order"),
    supabase.from("users").select("id, full_name").eq("role", "admin").order("full_name"),
    supabase
      .from("kb_entries")
      .select("id, question_fil, status, image_url, kb_categories(name_fil), owner:users(full_name)")
      .order("created_at", { ascending: false })
      .returns<EntryRow[]>(),
    getAppUser(supabase),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("entriesHeading")}</h1>
      <KbNav />

      <EntryForm
        categories={categories ?? []}
        admins={admins ?? []}
        currentUserId={currentUser?.id ?? ""}
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-ink/60">
              <th className="py-2 pr-4 font-medium">{t("questionFil")}</th>
              <th className="py-2 pr-4 font-medium">{t("category")}</th>
              <th className="py-2 pr-4 font-medium">{t("owner")}</th>
              <th className="py-2 pr-4 font-medium">{t("status")}</th>
              <th className="py-2 pr-4 font-medium">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {!entries || entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-ink/60">
                  {t("noEntries")}
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-b border-ink/5 align-top">
                  <td className="py-2 pr-4 text-ink">{entry.question_fil}</td>
                  <td className="py-2 pr-4 text-ink/70">{entry.kb_categories?.name_fil ?? "—"}</td>
                  <td className="py-2 pr-4 text-ink/70">{entry.owner?.full_name ?? "—"}</td>
                  <td className="py-2 pr-4 text-ink/70">
                    {entry.status === "published" ? t("statusPublished") : t("statusDraft")}
                  </td>
                  <td className="py-2 pr-4">
                    <EntryStatusToggle id={entry.id} status={entry.status} />
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
