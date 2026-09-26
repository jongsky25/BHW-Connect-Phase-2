"use client";

import { useTranslations } from "next-intl";
import { useSignOut } from "@/lib/nav/use-sign-out";

export function SignOutButton() {
  const t = useTranslations("authHome");
  const { signOut, pending } = useSignOut();

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
    >
      {t("signOut")}
    </button>
  );
}
