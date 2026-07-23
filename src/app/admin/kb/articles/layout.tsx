import { redirect } from "next/navigation";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import { createClient } from "@/lib/supabase/server";

export default async function AdminKbArticlesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const flags = await getFeatureFlags(supabase);

  if (!flags.kb_articles) {
    redirect("/admin/kb/categories");
  }

  return children;
}
