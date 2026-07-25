"use client";

import { useEffect } from "react";

type Props = {
  enabled: boolean;
};

// Feature-flag-gated like every other later-phase increment, but a
// service worker outlives a single page load once registered — flipping
// offline_pwa back off needs to actively unregister it, not just stop
// registering new ones, or a BHW who had it on keeps getting served from
// a stale cache after the flag's supposed kill switch.
export function ServiceWorkerRegister({ enabled }: Props) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (!enabled) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures (unsupported browser, blocked storage,
      // private-browsing restrictions) shouldn't affect the rest of the
      // app — offline support degrading to "not available" is fine.
    });
  }, [enabled]);

  return null;
}
