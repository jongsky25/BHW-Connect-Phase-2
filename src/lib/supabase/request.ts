import { cache } from "react";
import { getFeatureFlags } from "../flags/get-flags";
import { getAppUser } from "./app-user";
import { createClient } from "./server";

// Per-request memoised reads for Server Components. A layout and the page
// under it (e.g. /admin/layout.tsx + /admin/courses/page.tsx) both need the
// signed-in user, their profile and the feature flags; React's cache() makes
// the second caller reuse the first caller's result instead of paying another
// Supabase round trip. The memo lives for a single server render only, so
// it never leaks between users or requests.
//
// Only use these from pages and layouts. Server actions and route handlers
// should keep calling createClient()/getAppUser() directly: they may mutate
// the same rows and must see fresh data afterwards.

const getRequestClient = cache(createClient);

export const getRequestAuthUser = cache(async () => {
  const supabase = await getRequestClient();
  return supabase.auth.getUser();
});

export const getRequestAppUser = cache(async (authUserId: string) => {
  const supabase = await getRequestClient();
  return getAppUser(supabase, authUserId);
});

export const getRequestFeatureFlags = cache(async () => {
  const supabase = await getRequestClient();
  return getFeatureFlags(supabase);
});
