"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { endPreview, startPreview, type PreviewActionResult } from "@/app/actions/preview";
import { PREVIEWABLE_ROLES, type PreviewableRole } from "@/lib/auth/roles";
import { useDisclosure } from "@/components/nav/use-disclosure";

type Props = {
  role: PreviewableRole;
};

// Shown while an admin is previewing another user type (docs/role-feature-toggles-plan.md
// §4.4). Uses the `info` token (not `warning`, which is the super-admin
// persona bar's colour) and an eye icon, so the two banners are never
// mistaken for each other when both could apply to the same signed-in user.
export function PreviewBar({ role }: Props) {
  const t = useTranslations("preview");
  const tCommon = useTranslations("common");
  const { open, setOpen, containerRef, triggerRef } = useDisclosure<HTMLDivElement, HTMLButtonElement>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherRoles = PREVIEWABLE_ROLES.filter((candidate) => candidate !== role);

  async function run(action: () => Promise<PreviewActionResult>, destination: string) {
    setError(null);
    setPending(true);
    try {
      const result = await action();
      if (!result.ok) {
        setError(t(result.error));
        return;
      }
      // Full reload: every server-rendered page and cached route belongs to
      // the previous view.
      window.location.assign(destination);
    } finally {
      setPending(false);
    }
  }

  return (
    <div role="status" className="sticky top-0 z-30 border-b border-info/40 bg-info/10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm sm:px-6">
        <p className="flex items-center gap-2 text-ink">
          <span aria-hidden="true">👁️</span>
          {t("banner", { role: tCommon(`role.${role}`) })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div ref={containerRef} className="relative">
            <button
              ref={triggerRef}
              type="button"
              aria-expanded={open}
              aria-haspopup="true"
              disabled={pending}
              onClick={() => setOpen((value) => !value)}
              className="rounded-md border border-ink/20 px-3 py-1 font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
            >
              {t("switchAction")} ▾
            </button>
            {open ? (
              <div className="absolute left-0 top-full z-50 mt-2 min-w-40 rounded-md border border-ink/10 bg-canvas py-1 shadow-lg">
                {otherRoles.map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      run(() => startPreview(candidate), "/home");
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-ink/80 hover:bg-ink/5"
                  >
                    {tCommon(`role.${candidate}`)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(endPreview, "/admin/dashboard")}
            className="rounded-md bg-primary px-3 py-1 font-medium text-on-primary disabled:opacity-60"
          >
            {t("exitAction")}
          </button>
        </div>
        {error ? (
          <p role="alert" className="w-full text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
