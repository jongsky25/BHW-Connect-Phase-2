"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, inputClass } from "@/components/admin/form-field";
import { mapForumRpcError } from "@/lib/forum/error-messages";
import type { ForumCategory } from "@/lib/forum/types";
import { createClient } from "@/lib/supabase/client";

type Props = {
  categories: ForumCategory[];
};

export function ThreadForm({ categories }: Props) {
  const t = useTranslations("forum");
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const tags = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const { data, error: rpcError } = await supabase.rpc("rpc_forum_thread_create", {
        p_category_id: categoryId,
        p_title: title.trim(),
        p_body: body.trim(),
        p_tags: tags,
      });

      if (rpcError) {
        setError(t(mapForumRpcError(rpcError.message)));
        return;
      }

      const threadId = (data as Array<{ thread_id: string }>)[0]?.thread_id;
      if (threadId) {
        router.push(`/forum/${threadId}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-ink/10 p-4">
      <Field label={t("categoryLabel")} htmlFor="forum-thread-category">
        <select
          id="forum-thread-category"
          className={inputClass}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_en}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("titleLabel")} htmlFor="forum-thread-title">
        <input
          id="forum-thread-title"
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </Field>

      <Field label={t("bodyLabel")} htmlFor="forum-thread-body">
        <textarea
          id="forum-thread-body"
          className={`${inputClass} min-h-[120px]`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
      </Field>

      <Field label={t("tagsLabel")} htmlFor="forum-thread-tags">
        <input
          id="forum-thread-tags"
          className={inputClass}
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder={t("tagsPlaceholder")}
        />
      </Field>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading || !categoryId}
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-60"
      >
        {loading ? t("posting") : t("postThreadAction")}
      </button>
    </form>
  );
}
