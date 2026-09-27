// RFT B1 (docs/role-feature-toggles-plan.md §4.4): which user type an admin
// is previewing as ("View as"). httpOnly, and only ever honoured by
// middleware when the signed-in user is an admin (src/lib/supabase/middleware.ts) —
// a stale or forged cookie on a non-admin account is ignored and deleted.
// Session-only (no maxAge): closing the browser ends preview.
export const PREVIEW_COOKIE = "bhw_view_as";

export const PREVIEW_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
