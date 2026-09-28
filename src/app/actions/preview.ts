"use server";

import { cookies } from "next/headers";
import { isPreviewableRole } from "@/lib/auth/roles";
import { PREVIEW_COOKIE, PREVIEW_COOKIE_OPTIONS } from "@/lib/preview/cookies";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

export type PreviewActionResult = { ok: true } | { ok: false; error: "notAuthorizedError" | "genericError" };

// RFT B1 (docs/role-feature-toggles-plan.md §4.4): "View as" preview.
// A server action, not a route handler, so it goes through createClient()
// directly rather than the request.ts memo (that memo is for Server
// Component reads within a single render; this mutates a cookie). Returns a
// result instead of calling redirect() itself — the caller does a full
// navigation on success, same as switchToPersona/returnToSuperAdmin, since
// every server-rendered page and header belongs to the previous view.
export async function startPreview(role: string): Promise<PreviewActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "notAuthorizedError" };

  const appUser = await getAppUser(supabase, user.id);
  if (!appUser || appUser.role !== "admin") return { ok: false, error: "notAuthorizedError" };
  if (!isPreviewableRole(role)) return { ok: false, error: "genericError" };

  const cookieStore = await cookies();
  cookieStore.set(PREVIEW_COOKIE, role, PREVIEW_COOKIE_OPTIONS);
  return { ok: true };
}

export async function endPreview(): Promise<PreviewActionResult> {
  const cookieStore = await cookies();
  cookieStore.delete(PREVIEW_COOKIE);
  return { ok: true };
}
