import { EntryForm } from "@/components/kb/entry-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewKbEntryPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: owners }] = await Promise.all([
    supabase.from("kb_categories").select("id, name_fil, name_en, slug, sort_order").order("sort_order"),
    supabase.from("users").select("id, full_name, username").eq("role", "admin").order("full_name"),
  ]);

  return <EntryForm mode="create" categories={categories ?? []} owners={owners ?? []} />;
}
