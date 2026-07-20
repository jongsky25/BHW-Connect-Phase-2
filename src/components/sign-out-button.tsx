"use client";

import { useTranslations } from "next-intl";
import { signOut } from "@/lib/auth/actions";

export function SignOutButton() {
  const t = useTranslations("nav");

  return (
    <form action={signOut}>
      <button type="submit" className="text-sm text-secondary hover:underline">
        {t("signOut")}
      </button>
    </form>
  );
}
