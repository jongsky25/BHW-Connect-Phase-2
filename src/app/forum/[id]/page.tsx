import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { ReplyForm } from "@/components/forum/reply-form";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import type { ForumPost } from "@/lib/forum/types";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

type ThreadDetailRow = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  author_full_name: string;
  status: "visible" | "hidden";
  created_at: string;
  forum_categories: { name_fil: string; name_en: string } | null;
};

export default async function ForumThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const flags = await getFeatureFlags(supabase);

  if (!flags.forum) {
    redirect("/home");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const appUser = await getAppUser(supabase, user.id);
  if (!appUser) {
    redirect("/login");
  }

  const t = await getTranslations("forum");

  const { data: thread } = await supabase
    .from("forum_threads")
    .select("id, title, body, tags, author_full_name, status, created_at, forum_categories(name_fil, name_en)")
    .eq("id", id)
    .maybeSingle<ThreadDetailRow>();

  if (!thread) {
    notFound();
  }

  const { data: posts } = await supabase
    .from("forum_posts")
    .select("id, thread_id, author_user_id, author_full_name, author_username, body, status, hidden_reason, created_at")
    .eq("thread_id", id)
    .eq("status", "visible")
    .order("created_at", { ascending: true })
    .returns<ForumPost[]>();

  const rows = posts ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        {thread.status === "hidden" ? (
          <p role="status" className="mb-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
            {t("threadHiddenNotice")}
          </p>
        ) : null}
        <p className="text-sm text-ink/70">{thread.forum_categories?.name_en ?? "—"}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{thread.title}</h1>
        <p className="mt-1 text-sm text-ink/70">{thread.author_full_name}</p>
        {thread.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {thread.tags.map((tagValue) => (
              <span key={tagValue} className="rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink/70">
                #{tagValue}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-4 whitespace-pre-wrap text-ink">{thread.body}</p>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">{t("repliesHeading")}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-ink/70">{t("noReplies")}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map((post) => (
              <li key={post.id} className="rounded-md border border-ink/10 p-3">
                <p className="whitespace-pre-wrap text-ink">{post.body}</p>
                <p className="mt-2 text-sm text-ink/70">{post.author_full_name}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ReplyForm threadId={thread.id} />
    </div>
  );
}
