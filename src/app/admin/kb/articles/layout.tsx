import { redirect } from "next/navigation";
import { getRequestFeatureFlags } from "@/lib/supabase/request";

export default async function AdminKbArticlesLayout({ children }: { children: React.ReactNode }) {
  const flags = await getRequestFeatureFlags();

  if (!flags.kb_articles) {
    redirect("/admin/kb/categories");
  }

  return children;
}
