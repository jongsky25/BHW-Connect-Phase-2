import { redirect } from "next/navigation";
import { ForumConsole } from "@/components/forum/forum-console";
import type { ForumPostModerationRow, ForumThreadModerationRow } from "@/lib/forum/types";
import { createClient } from "@/lib/supabase/server";
import { getRequestMasterFlags } from "@/lib/supabase/request";

export default async function AdminForumPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewParam } = await searchParams;
  const view = viewParam === "archived" ? "archived" : "active";
  const supabase = await createClient();
  const flags = await getRequestMasterFlags();

  if (!flags.forum) {
    redirect("/admin/users");
  }

  const [{ data: categories }, { data: threads }, { data: posts }] = await Promise.all([
    supabase.from("forum_categories").select("id, slug, name_fil, name_en, description_fil, description_en, sort_order").order("sort_order"),
    supabase
      .from("forum_threads")
      .select("id, title, author_full_name, status, hidden_reason, created_at, archived_at, forum_categories(name_fil, name_en)")
      .order("created_at", { ascending: false })
      .returns<ForumThreadModerationRow[]>(),
    supabase
      .from("forum_posts")
      .select("id, thread_id, body, author_full_name, status, hidden_reason, created_at, forum_threads(title)")
      .order("created_at", { ascending: false })
      .returns<ForumPostModerationRow[]>(),
  ]);

  const allThreads = threads ?? [];
  const activeThreads = allThreads.filter((t) => !t.archived_at);
  const archivedThreads = allThreads.filter((t) => t.archived_at);

  return (
    <ForumConsole
      initialCategories={categories ?? []}
      threads={view === "archived" ? archivedThreads : activeThreads}
      view={view}
      activeCount={activeThreads.length}
      archivedCount={archivedThreads.length}
      initialPosts={posts ?? []}
    />
  );
}
