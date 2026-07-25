"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { inputClass } from "@/components/admin/form-field";
import { mapForumRpcError } from "@/lib/forum/error-messages";
import { createClient } from "@/lib/supabase/client";

type Props = {
  threadId: string;
};

export function ReplyForm({ threadId }: Props) {
  const t = useTranslations("forum");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_forum_post_create", {
        p_thread_id: threadId,
        p_body: body.trim(),
      });

      if (rpcError) {
        setError(t(mapForumRpcError(rpcError.message)));
        return;
      }

      setBody("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="forum-reply-body" className="text-sm font-medium text-ink">
        {t("replyLabel")}
      </label>
      <textarea
        id="forum-reply-body"
        className={`${inputClass} min-h-[80px]`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-canvas disabled:opacity-60"
      >
        {loading ? t("posting") : t("postReplyAction")}
      </button>
    </form>
  );
}
