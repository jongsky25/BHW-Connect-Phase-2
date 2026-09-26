"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { clearSuperAdminCookies } from "@/app/actions/super-admin";
import { clearOfflineCache } from "@/lib/pwa/clear-offline-cache";

/**
 * Shared sign-out logic for every sign-out entry point (the /home button,
 * the user menu, and the mobile drawer from 1.4), so they can't drift.
 *
 * The lock is a ref, not just the `pending` state: two clicks fired back to
 * back (before React has flushed the state update from the first) would
 * both read the same stale `pending` value from a state-only guard. A ref
 * is read/written synchronously, so the second call sees the first call's
 * lock immediately, with no batching window to race through.
 */
export function useSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const lockedRef = useRef(false);

  async function signOut() {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setPending(true);
    try {
      // Clear the parked super admin cookies while still signed in: the
      // server action posts to the current (protected) page, and once the
      // session is gone the middleware redirects that post to /login,
      // which makes the action call throw. A failure here is not fatal —
      // the cookies expire, and the return cookie is only honoured for
      // that super admin's own personas.
      await clearSuperAdminCookies().catch(() => undefined);
      // Loaded on click, not at module scope: the header (and so this hook)
      // is in the root layout, and a static import would put the Supabase
      // browser client (~50 KB gzipped) on every page, including signed-out
      // ones — enough to fail the Lighthouse script-size budget on "/".
      const { createClient } = await import("@/lib/supabase/client");
      await createClient().auth.signOut();
      await clearOfflineCache();
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return { signOut, pending };
}
