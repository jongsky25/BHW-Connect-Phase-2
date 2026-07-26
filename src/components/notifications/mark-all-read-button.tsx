"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function MarkAllReadButton() {
  const t = useTranslations("notifications");
  const router = useRouter();

  async function handleClick() {
    const supabase = createClient();
    await supabase.rpc("rpc_notifications_mark_read");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="self-start rounded-md border border-ink/20 px-4 py-2 font-medium text-ink hover:bg-ink/5"
    >
      {t("markAllRead")}
    </button>
  );
}
