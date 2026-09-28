"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useDisclosure } from "@/components/nav/use-disclosure";
import { mapElearningRpcError } from "@/lib/elearning/error-messages";
import { createClient } from "@/lib/supabase/client";
import type { OrgLevel } from "@/lib/org-units";

type Ancestor = { id: string; name: string; level: OrgLevel };

type Props = {
  courseId: string;
  orgUnitId: string;
  orgUnitName: string;
};

// Super-admin-only action (courses-console.tsx renders this only when the
// caller is a super admin; rpc_course_set_org_unit re-checks server-side).
// Widening is the only direction offered: rpc_org_unit_ancestors lists the
// course's current org unit's ancestors, so every option here already
// contains everyone who can already see the course.
export function ChangeScopeAction({ courseId, orgUnitId, orgUnitName }: Props) {
  const t = useTranslations("admin.courses");
  const router = useRouter();
  const { open, setOpen, containerRef, triggerRef } = useDisclosure<HTMLDivElement, HTMLButtonElement>();
  const panelId = useId();
  const [ancestors, setAncestors] = useState<Ancestor[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [target, setTarget] = useState<Ancestor | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    if (ancestors) return;
    setLoadFailed(false);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("rpc_org_unit_ancestors", {
      p_org_unit_id: orgUnitId,
    });
    if (rpcError) {
      setLoadFailed(true);
      return;
    }
    setAncestors((data as Ancestor[] | null) ?? []);
  }

  async function handleWiden() {
    if (!target) return;
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_course_set_org_unit", {
        p_course_id: courseId,
        p_org_unit_id: target.id,
      });
      if (rpcError) {
        setError(t(mapElearningRpcError(rpcError.message)));
        return;
      }
      router.refresh();
      setOpen(false);
      setTarget(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        disabled={pending}
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className="min-h-[44px] rounded-md border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
      >
        {t("changeScopeAction")}
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-md border border-ink/10 bg-canvas p-3 shadow-lg"
        >
          <p className="text-sm font-medium text-ink">{t("changeScopeHeading")}</p>
          <p className="mt-1 text-xs text-ink/70">{t("currentScopeLabel", { name: orgUnitName })}</p>
          <p className="mt-2 text-xs text-ink/60">{t("changeScopeHint")}</p>

          {loadFailed ? (
            <p role="alert" className="mt-2 text-xs text-danger">
              {t("genericError")}
            </p>
          ) : !ancestors ? (
            <p className="mt-2 text-xs text-ink/60">{t("loadingScopeOptions")}</p>
          ) : ancestors.length === 0 ? (
            <p className="mt-2 text-xs text-ink/60">{t("noWiderScopeAvailable")}</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              <select
                value={target?.id ?? ""}
                onChange={(event) =>
                  setTarget(ancestors.find((unit) => unit.id === event.target.value) ?? null)
                }
                disabled={pending}
                className="rounded-md border border-ink/20 bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 disabled:opacity-60"
              >
                <option value="">{t("newScopeLabel")}</option>
                {ancestors.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>

              {target ? (
                <p className="text-xs text-ink">{t("changeScopeConfirm", { name: target.name })}</p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setTarget(null);
                  }}
                  className="min-h-[44px] rounded-md border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink/5"
                >
                  {t("changeScopeCancel")}
                </button>
                <button
                  type="button"
                  disabled={!target || pending}
                  onClick={handleWiden}
                  className="min-h-[44px] rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-on-primary disabled:opacity-60"
                >
                  {t("changeScopeConfirmAction")}
                </button>
              </div>
            </div>
          )}

          {error ? (
            <p role="alert" className="mt-2 text-xs text-danger">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
