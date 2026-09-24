// While the browser is signed in as a persona, the super admin's own
// session is parked here: its refresh token, so the super admin can be
// restored without a password. httpOnly, and only ever honoured when the
// currently signed-in user is one of that super admin's own personas
// (rpc_super_admin_context), so a stale cookie left on a shared device
// cannot sign a different user into the super admin.
export const SUPER_ADMIN_RETURN_COOKIE = "bhw_super_admin_return";

// The persona list shown in the persona bar (see PersonaSnapshot).
export const SUPER_ADMIN_PERSONAS_COOKIE = "bhw_super_admin_personas";

export const SUPER_ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 7 * 24 * 60 * 60,
};
