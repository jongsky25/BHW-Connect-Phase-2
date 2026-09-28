import { headers } from "next/headers";
import { cache } from "react";
import { DEFAULT_FLAGS, getFeatureFlags } from "../flags/get-flags";
import type { FeatureFlags } from "../flags/types";
import { APP_FLAGS_HEADER, forwardedAppUser, getAppUser, type AppUser } from "./app-user";
import { createClient } from "./server";

// Per-request memoised reads for Server Components. A layout and the page
// under it (e.g. /admin/layout.tsx + /admin/courses/page.tsx) both need the
// signed-in user, their profile and the feature flags; React's cache() makes
// the second caller reuse the first caller's result instead of paying another
// Supabase round trip. The memo lives for a single server render only, so
// it never leaks between users or requests.
//
// Middleware (./middleware.ts) has usually read the profile and flags for
// this very request already and forwards them as x-app-user / x-app-flags
// headers; these helpers reuse those instead of querying users and
// feature_flags again. They fall back to Supabase when the headers are absent
// (paths middleware returns early on, like /consent) or belong to a different
// account than the current session (a persona switch inside a server action).
//
// Only use these from pages and layouts. Server actions and route handlers
// should keep calling createClient()/getAppUser() directly: they may mutate
// the same rows and must see fresh data afterwards.

const getRequestClient = cache(createClient);

// Callers only need the id. getClaims() verifies the session's access token
// locally against the project's ES256 signing key instead of asking the Auth
// server (getUser()), which was a network call plus an auth.users read on
// every page render — on top of the same call in middleware.
export const getRequestAuthUser = cache(async () => {
  const supabase = await getRequestClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return { data: { user: sub ? { id: sub } : null }, error };
});

export const getRequestAppUser = cache(async (authUserId: string): Promise<AppUser | null> => {
  const forwarded = forwardedAppUser(await headers(), authUserId);
  if (forwarded) return forwarded;
  const supabase = await getRequestClient();
  return getAppUser(supabase, authUserId);
});

export const getRequestFeatureFlags = cache(async (): Promise<FeatureFlags> => {
  const raw = (await headers()).get(APP_FLAGS_HEADER);
  if (raw) {
    try {
      return { ...DEFAULT_FLAGS, ...(JSON.parse(raw) as Partial<FeatureFlags>) };
    } catch {
      // fall through to a real read
    }
  }
  // feature_flags is readable only with a session (RLS: auth.uid() is not
  // null), so a signed-out render would get zero rows and the defaults
  // anyway — skip the round trip.
  const {
    data: { user },
  } = await getRequestAuthUser();
  if (!user) return { ...DEFAULT_FLAGS };
  const supabase = await getRequestClient();
  return getFeatureFlags(supabase);
});
