"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { clearSuperAdminCookies } from "@/app/actions/super-admin";
import { clearOfflineCache } from "@/lib/pwa/clear-offline-cache";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const t = useTranslations("authHome");
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    await clearSuperAdminCookies();
    await clearOfflineCache();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ink hover:bg-ink/5"
    >
      {t("signOut")}
    </button>
  );
}
