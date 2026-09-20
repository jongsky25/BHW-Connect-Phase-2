import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EntryForm } from "@/components/kb/entry-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewKbEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ fromUnmatched?: string }>;
}) {
  const { fromUnmatched } = await searchParams;
  const supabase = await createClient();

  const [{ data: categories }, { data: owners }, { data: unmatched }] = await Promise.all([
    supabase.from("kb_categories").select("id, name_fil, name_en, slug, sort_order").order("sort_order"),
    supabase.from("users").select("id, full_name, username").eq("role", "admin").order("full_name"),
    fromUnmatched
      ? supabase.from("unmatched_questions").select("id, text").eq("id", fromUnmatched).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const prefill = unmatched ? { sourceUnmatchedQuestionId: unmatched.id, text: unmatched.text } : undefined;

  const t = await getTranslations("admin.kbEntries");
  const tCrumbs = await getTranslations("breadcrumbs");

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: tCrumbs("home"), href: "/home" },
          { label: t("heading"), href: "/admin/kb/entries" },
          { label: t("newAction") },
        ]}
      />
      <EntryForm mode="create" categories={categories ?? []} owners={owners ?? []} prefill={prefill} />
    </div>
  );
}
