"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { mapAdminRpcError } from "@/lib/admin/error-messages";
import { useDisclosure } from "@/components/nav/use-disclosure";
import { createClient } from "@/lib/supabase/client";
import {
  actionsFor,
  type VisibilityAction,
  type VisibilityContentType,
  type VisibilityExtraAction,
  type VisibilityState,
} from "./types";

type Props = VisibilityState & {
  contentType: VisibilityContentType;
  id: string;
  /** A content-type-specific extra menu item, e.g. announcements' Delete
   * (plan §7 C4). Rendered after the standard actions, each with its own
   * confirm step. */
  extraActions?: VisibilityExtraAction[];
};

const ACTION_LABEL_KEY: Record<VisibilityAction, string> = {
  hide: "hideAction",
  show: "showAction",
  archive: "archiveAction",
  restore: "restoreAction",
};

type PendingConfirm =
  | { kind: "archive" }
  | { kind: "extra"; action: VisibilityExtraAction };

// A disclosure menu (button + conditionally-rendered panel), same pattern as
// the header's MoreMenu — not role="menu"/role="menuitem". Archive, and any
// extra action that asks for one, shows a confirmation step first (plan
// §4.5); every other action fires immediately.
export function VisibilityActions({ contentType, id, hidden_at, archived_at, extraActions = [] }: Props) {
  const t = useTranslations("admin.visibility");
  const router = useRouter();
  const { open, setOpen, containerRef, triggerRef } = useDisclosure<HTMLDivElement, HTMLButtonElement>();
  const panelId = useId();
  const [confirming, setConfirming] = useState<PendingConfirm | null>(null);
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

  async function runVisibility(action: VisibilityAction) {
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
      setConfirming(null);
      setOpen(false);
    }
  }

  async function runExtra(action: VisibilityExtraAction) {
    setError(null);
    setPending(true);
    try {
      const result = await action.run();
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
      setConfirming(null);
      setOpen(false);
    }
  }

  function handleActionClick(action: VisibilityAction) {
    if (action === "archive") {
      setConfirming({ kind: "archive" });
      return;
    }
    runVisibility(action);
  }

  function handleExtraClick(action: VisibilityExtraAction) {
    setConfirming({ kind: "extra", action });
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
          {confirming ? (
            <div
              role="alertdialog"
              aria-label={confirming.kind === "archive" ? t("confirmArchive") : confirming.action.confirm.message}
              className="flex flex-col gap-2 p-3"
            >
              <p className="text-sm text-ink">
                {confirming.kind === "archive" ? t("confirmArchive") : confirming.action.confirm.message}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="min-h-[44px] rounded-md border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink/5"
                >
                  {t("cancelAction")}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    confirming.kind === "archive" ? runVisibility("archive") : runExtra(confirming.action)
                  }
                  className="min-h-[44px] rounded-md bg-danger px-3 py-1.5 text-xs font-medium text-on-primary disabled:opacity-60"
                >
                  {confirming.kind === "archive" ? t("confirmArchiveAction") : confirming.action.confirm.confirmLabel}
                </button>
              </div>
            </div>
          ) : (
            <>
              {available.map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={pending}
                  onClick={() => handleActionClick(action)}
                  className="block w-full px-4 py-2 text-left text-sm text-ink/80 hover:bg-ink/5 disabled:opacity-60"
                >
                  {t(ACTION_LABEL_KEY[action])}
                </button>
              ))}
              {extraActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  disabled={pending}
                  onClick={() => handleExtraClick(action)}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-ink/5 disabled:opacity-60 ${
                    action.danger ? "text-danger" : "text-ink/80"
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </>
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
