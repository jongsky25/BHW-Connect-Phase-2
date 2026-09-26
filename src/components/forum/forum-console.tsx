"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/empty-state";
import { mapForumRpcError } from "@/lib/forum/error-messages";
import type { ForumCategory, ForumPostModerationRow, ForumThreadModerationRow } from "@/lib/forum/types";
import { createClient } from "@/lib/supabase/client";
import { CategoryForm } from "./category-form";

type Props = {
  initialCategories: ForumCategory[];
  initialThreads: ForumThreadModerationRow[];
  initialPosts: ForumPostModerationRow[];
};

export function ForumConsole({ initialCategories, initialThreads, initialPosts }: Props) {
  const t = useTranslations("admin.forum");
  const [categories, setCategories] = useState(initialCategories);
  const [threads, setThreads] = useState(initialThreads);
  const [posts, setPosts] = useState(initialPosts);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteCategory(id: string) {
    setError(null);
    setPendingId(id);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_forum_category_delete", { p_category_id: id });
      if (rpcError) {
        setError(t(mapForumRpcError(rpcError.message)));
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setPendingId(null);
    }
  }

  async function handleModerateThread(id: string, hidden: boolean) {
    setError(null);
    setPendingId(id);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_forum_thread_moderate", {
        p_thread_id: id,
        p_hidden: hidden,
        p_reason: null,
      });
      if (rpcError) {
        setError(t(mapForumRpcError(rpcError.message)));
        return;
      }
      setThreads((prev) => prev.map((th) => (th.id === id ? { ...th, status: hidden ? "hidden" : "visible" } : th)));
    } finally {
      setPendingId(null);
    }
  }

  async function handleModeratePost(id: string, hidden: boolean) {
    setError(null);
    setPendingId(id);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_forum_post_moderate", {
        p_post_id: id,
        p_hidden: hidden,
        p_reason: null,
      });
      if (rpcError) {
        setError(t(mapForumRpcError(rpcError.message)));
        return;
      }
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: hidden ? "hidden" : "visible" } : p)));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title={t("heading")} />

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">{t("categoriesHeading")}</h2>
        <CategoryForm onCreated={(category) => setCategories((prev) => [...prev, category])} />
        {categories.length === 0 ? (
          <EmptyState message={t("noCategories")} />
        ) : (
          <ul className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-ink">{category.name_en}</p>
                  <p className="text-sm text-ink/70">{category.slug}</p>
                </div>
                <button
                  type="button"
                  disabled={pendingId === category.id}
                  onClick={() => handleDeleteCategory(category.id)}
                  className="rounded-md border border-danger/40 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
                >
                  {t("deleteCategoryAction")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">{t("threadsHeading")}</h2>
        {threads.length === 0 ? (
          <EmptyState message={t("noThreads")} />
        ) : (
          <ul className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
            {threads.map((thread) => (
              <li key={thread.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-ink">{thread.title}</p>
                  <p className="text-sm text-ink/70">
                    {thread.forum_categories?.name_en ?? "—"} · {thread.author_full_name} ·{" "}
                    {t(`status.${thread.status}`)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pendingId === thread.id}
                  onClick={() => handleModerateThread(thread.id, thread.status !== "hidden")}
                  className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
                >
                  {thread.status === "hidden" ? t("unhideAction") : t("hideAction")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">{t("postsHeading")}</h2>
        {posts.length === 0 ? (
          <EmptyState message={t("noPosts")} />
        ) : (
          <ul className="flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10">
            {posts.map((post) => (
              <li key={post.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm text-ink">{post.body}</p>
                  <p className="text-sm text-ink/70">
                    {post.forum_threads?.title ?? "—"} · {post.author_full_name} · {t(`status.${post.status}`)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pendingId === post.id}
                  onClick={() => handleModeratePost(post.id, post.status !== "hidden")}
                  className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
                >
                  {post.status === "hidden" ? t("unhideAction") : t("hideAction")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
