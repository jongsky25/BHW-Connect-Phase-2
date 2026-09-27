import { cache } from "react";
import { resolveFlags } from "../flags/get-flags";
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

const getRequestFlagRows = cache(async () => {
  const supabase = await getRequestClient();
  const { data } = await supabase.from("feature_flags").select("key, enabled, disabled_roles");
  return data ?? [];
});

// Role-effective flags for the signed-in user (docs/role-feature-toggles-plan.md
// §5 A2): a flag disabled for their role reads false even while its master
// switch is on. Falls back to the master switches when signed out, since
// there's no role to resolve against.
export const getRequestFeatureFlags = cache(async () => {
  const rows = await getRequestFlagRows();
  const {
    data: { user },
  } = await getRequestAuthUser();
  if (!user) return resolveFlags(rows);
  const appUser = await getRequestAppUser(user.id);
  return resolveFlags(rows, appUser?.role);
});

// The master "Available" switches, ignoring every per-type disabled_roles
// entry. Admin console pages and layouts use this — nothing is ever hidden
// from admins (plan §2 D2); they use View-as (plan §4.4) to preview another
// user type's view instead.
export const getRequestMasterFlags = cache(async () => {
  const rows = await getRequestFlagRows();
  return resolveFlags(rows);
});
