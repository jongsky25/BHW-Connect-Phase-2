import { redirect } from "next/navigation";
import { getRequestMasterFlags } from "@/lib/supabase/request";

export default async function AdminKbArticlesLayout({ children }: { children: React.ReactNode }) {
  const flags = await getRequestMasterFlags();

  if (!flags.kb_articles) {
    redirect("/admin/kb/categories");
  }

  return children;
}
