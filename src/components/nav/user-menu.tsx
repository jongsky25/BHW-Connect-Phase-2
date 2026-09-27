"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useId, useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { startPreview } from "@/app/actions/preview";
import { PREVIEWABLE_ROLES } from "@/lib/auth/roles";
import type { AppUser } from "@/lib/supabase/app-user";
import { useSignOut } from "@/lib/nav/use-sign-out";
import { useDisclosure } from "./use-disclosure";

type Props = {
  account: { username: string; role: AppUser["role"] };
};

// Usernames here are dotted (e.g. "rosa.bhw"), not display names, so a
// single leading letter is the only initial that means anything.
function initialsFrom(username: string): string {
  return (username.match(/[a-zA-Z]/)?.[0] ?? "").toUpperCase();
}

export function UserMenu({ account }: Props) {
  const t = useTranslations("common");
  const tNav = useTranslations("authHome");
  const tFooter = useTranslations("footer");
  const tPreview = useTranslations("preview");
  const { open, setOpen, containerRef, triggerRef } = useDisclosure<HTMLDivElement, HTMLButtonElement>();
  const { signOut, pending } = useSignOut();
  const [previewPending, setPreviewPending] = useState(false);
  const panelId = useId();

  // RFT B1 (docs/role-feature-toggles-plan.md §4.4): only an admin who
  // isn't already previewing sees "View as" here — while previewing,
  // `account.role` is the preview role, so this is naturally hidden, and
  // the preview bar's own "Switch" control takes over.
  async function startViewAs(role: (typeof PREVIEWABLE_ROLES)[number]) {
    setOpen(false);
    setPreviewPending(true);
    try {
      const result = await startPreview(role);
      if (result.ok) window.location.assign("/home");
    } finally {
      setPreviewPending(false);
    }
  }

  const accessibleName = t("signedInAs", { username: account.username, role: t(`role.${account.role}`) });

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={panelId}
        aria-label={accessibleName}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-full transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary"
        >
          {initialsFrom(account.username)}
        </span>
        <span aria-hidden="true" className="text-ink/50">
          ▾
        </span>
      </button>
      {open ? (
        <div
          id={panelId}
          className="absolute right-0 top-full z-50 mt-2 min-w-56 rounded-md border border-ink/10 bg-canvas py-1 shadow-lg"
        >
          <div className="border-b border-ink/10 px-4 py-2">
            <p className="truncate text-sm font-medium text-ink" title={account.username}>
              {account.username}
            </p>
            <p className="text-xs text-ink/70">{t(`role.${account.role}`)}</p>
          </div>
          {account.role === "admin" ? (
            <div className="border-b border-ink/10 px-4 py-2">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink/50">
                {tPreview("viewAsLabel")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PREVIEWABLE_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    disabled={previewPending}
                    onClick={() => startViewAs(role)}
                    className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
                  >
                    {t(`role.${role}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-ink/80 hover:bg-ink/5"
          >
            {tNav("settingsCta")}
          </Link>
          <Link
            href="/settings#display"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-ink/80 hover:bg-ink/5"
          >
            {t("displayLabel")}
          </Link>
          <div className="px-4 py-2">
            <LanguageToggle signedIn />
          </div>
          <Link
            href="/privacy"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-ink/80 hover:bg-ink/5"
          >
            {tFooter("privacyNotice")}
          </Link>
          <div className="my-1 border-t border-ink/10" />
          <button
            type="button"
            onClick={signOut}
            disabled={pending}
            className="block w-full px-4 py-2 text-left text-sm text-ink/80 hover:bg-ink/5 disabled:opacity-60"
          >
            {tNav("signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
