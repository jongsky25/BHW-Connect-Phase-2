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
    try {
      // Clear the parked super admin cookies while still signed in: the
      // server action posts to the current (protected) page, and once the
      // session is gone the middleware redirects that post to /login,
      // which makes the action call throw. A failure here is not fatal —
      // the cookies expire, and the return cookie is only honoured for
      // that super admin's own personas.
      await clearSuperAdminCookies().catch(() => undefined);
      await createClient().auth.signOut();
      await clearOfflineCache();
    } finally {
      router.push("/login");
      router.refresh();
    }
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
