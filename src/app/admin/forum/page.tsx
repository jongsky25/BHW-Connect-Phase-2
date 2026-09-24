import { redirect } from "next/navigation";
import { ForumConsole } from "@/components/forum/forum-console";
import type { ForumPostModerationRow, ForumThreadModerationRow } from "@/lib/forum/types";
import { createClient } from "@/lib/supabase/server";
import { getRequestFeatureFlags } from "@/lib/supabase/request";

export default async function AdminForumPage() {
  const supabase = await createClient();
  const flags = await getRequestFeatureFlags();

  if (!flags.forum) {
    redirect("/admin/users");
  }

  const [{ data: categories }, { data: threads }, { data: posts }] = await Promise.all([
    supabase.from("forum_categories").select("id, slug, name_fil, name_en, description_fil, description_en, sort_order").order("sort_order"),
    supabase
      .from("forum_threads")
      .select("id, title, author_full_name, status, hidden_reason, created_at, forum_categories(name_fil, name_en)")
      .order("created_at", { ascending: false })
      .returns<ForumThreadModerationRow[]>(),
    supabase
      .from("forum_posts")
      .select("id, thread_id, body, author_full_name, status, hidden_reason, created_at, forum_threads(title)")
      .order("created_at", { ascending: false })
      .returns<ForumPostModerationRow[]>(),
  ]);

  return (
    <ForumConsole
      initialCategories={categories ?? []}
      initialThreads={threads ?? []}
      initialPosts={posts ?? []}
    />
  );
}
