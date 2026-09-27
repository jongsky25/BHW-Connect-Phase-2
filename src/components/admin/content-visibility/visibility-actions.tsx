"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { mapAdminRpcError } from "@/lib/admin/error-messages";
import { useDisclosure } from "@/components/nav/use-disclosure";
import { createClient } from "@/lib/supabase/client";
import { actionsFor, type VisibilityAction, type VisibilityContentType, type VisibilityState } from "./types";

type Props = VisibilityState & {
  contentType: VisibilityContentType;
  id: string;
};

const ACTION_LABEL_KEY: Record<VisibilityAction, string> = {
  hide: "hideAction",
  show: "showAction",
  archive: "archiveAction",
  restore: "restoreAction",
};

// A disclosure menu (button + conditionally-rendered panel), same pattern as
// the header's MoreMenu — not role="menu"/role="menuitem". Archive asks for
// confirmation first (plan §4.5); every other action fires immediately.
export function VisibilityActions({ contentType, id, hidden_at, archived_at }: Props) {
  const t = useTranslations("admin.visibility");
  const router = useRouter();
  const { open, setOpen, containerRef, triggerRef } = useDisclosure<HTMLDivElement, HTMLButtonElement>();
  const panelId = useId();
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHidden = Boolean(hidden_at);
  const isArchived = Boolean(archived_at);
  const available = actionsFor(contentType).filter((action) => {
    if (action === "hide") return !isHidden && !isArchived;
    if (action === "show") return isHidden && !isArchived;
    if (action === "archive") return !isArchived;
    return isArchived; // restore
  });

  async function run(action: VisibilityAction) {
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_content_set_visibility", {
        p_type: contentType,
        p_id: id,
        p_action: action,
      });
      if (rpcError) {
        setError(t(mapAdminRpcError(rpcError.message)));
        return;
      }
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
      setConfirmingArchive(false);
      setOpen(false);
    }
  }

  function handleActionClick(action: VisibilityAction) {
    if (action === "archive") {
      setConfirmingArchive(true);
      return;
    }
    run(action);
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={panelId}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className="min-h-[44px] rounded-md border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
      >
        {t("actionsLabel")} <span aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute right-0 top-full z-50 mt-2 min-w-56 rounded-md border border-ink/10 bg-canvas py-1 shadow-lg"
        >
          {confirmingArchive ? (
            <div role="alertdialog" aria-label={t("confirmArchive")} className="flex flex-col gap-2 p-3">
              <p className="text-sm text-ink">{t("confirmArchive")}</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingArchive(false)}
                  className="min-h-[44px] rounded-md border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink/5"
                >
                  {t("cancelAction")}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run("archive")}
                  className="min-h-[44px] rounded-md bg-danger px-3 py-1.5 text-xs font-medium text-on-primary disabled:opacity-60"
                >
                  {t("confirmArchiveAction")}
                </button>
              </div>
            </div>
          ) : (
            available.map((action) => (
              <button
                key={action}
                type="button"
                disabled={pending}
                onClick={() => handleActionClick(action)}
                className="block w-full px-4 py-2 text-left text-sm text-ink/80 hover:bg-ink/5 disabled:opacity-60"
              >
                {t(ACTION_LABEL_KEY[action])}
              </button>
            ))
          )}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
