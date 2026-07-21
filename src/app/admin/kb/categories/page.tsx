import { CategoriesConsole } from "@/components/kb/categories-console";
import { createClient } from "@/lib/supabase/server";

export default async function AdminKbCategoriesPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("kb_categories")
    .select("id, name_fil, name_en, slug, sort_order")
    .order("sort_order");

  return <CategoriesConsole initialCategories={categories ?? []} />;
}
