"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { PreviewNote } from "@/components/preview/preview-note";
import { usePreview } from "@/components/preview/preview-provider";
import { createClient } from "@/lib/supabase/client";

export function MarkAllReadButton() {
  const t = useTranslations("notifications");
  const router = useRouter();
  const isPreview = usePreview();

  async function handleClick() {
    const supabase = createClient();
    await supabase.rpc("rpc_notifications_mark_read");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPreview}
        className="self-start rounded-md border border-ink/20 px-4 py-2 font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
      >
        {t("markAllRead")}
      </button>
      {isPreview ? <PreviewNote /> : null}
    </div>
  );
}
