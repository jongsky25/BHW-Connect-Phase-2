import { cache } from "react";
import { headers } from "next/headers";
import type { AppUser } from "@/lib/supabase/app-user";
import { getRequestAppUser, getRequestAuthUser } from "@/lib/supabase/request";
import { isAppRole, type AppRole } from "./roles";

export type Viewer = {
  appUser: AppUser | null;
  // The effective role for gating and flags (docs/role-feature-toggles-plan.md
  // §4.4): the preview role while an admin is previewing, otherwise the
  // signed-in user's own role. Null when signed out.
  role: AppRole | null;
  isPreview: boolean;
};

// The signed-in user's profile plus the role every page and layout should
// gate on. Middleware (src/lib/supabase/middleware.ts) already validated any
// `bhw_view_as` cookie and forwards the result as the `x-app-effective-role`
// and `x-app-preview` headers, so this does no extra Supabase round trip —
// same per-request memo pattern as the rest of src/lib/supabase/request.ts.
export const getViewer = cache(async (): Promise<Viewer> => {
  const {
    data: { user },
  } = await getRequestAuthUser();
  if (!user) return { appUser: null, role: null, isPreview: false };

  const appUser = await getRequestAppUser(user.id);
  if (!appUser) return { appUser: null, role: null, isPreview: false };

  const h = await headers();
  const isPreview = h.get("x-app-preview") === "1";
  const effectiveRoleHeader = h.get("x-app-effective-role");
  const role = isPreview && isAppRole(effectiveRoleHeader) ? effectiveRoleHeader : appUser.role;

  return { appUser, role, isPreview };
});
