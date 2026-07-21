import { notFound } from "next/navigation";
import { EntryForm } from "@/components/kb/entry-form";
import { createClient } from "@/lib/supabase/server";

export default async function EditKbEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: entry }, { data: categories }, { data: owners }] = await Promise.all([
    supabase
      .from("kb_entries")
      .select(
        "id, category_id, question_fil, question_en, answer_fil, answer_en, keywords, image_url, status, owner_user_id, review_due_on, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("kb_categories").select("id, name_fil, name_en, slug, sort_order").order("sort_order"),
    supabase.from("users").select("id, full_name, username").eq("role", "admin").order("full_name"),
  ]);

  if (!entry) {
    notFound();
  }

  return <EntryForm mode="edit" entry={entry} categories={categories ?? []} owners={owners ?? []} />;
}
