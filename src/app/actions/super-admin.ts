"use server";

import { createClient as createStandaloneClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  SUPER_ADMIN_COOKIE_OPTIONS,
  SUPER_ADMIN_PERSONAS_COOKIE,
  SUPER_ADMIN_RETURN_COOKIE,
} from "@/lib/super-admin/cookies";
import {
  isPersonaRole,
  mapSuperAdminRpcError,
  type PersonaResetResult,
  type PersonaSnapshot,
  type SuperAdminActionResult,
  type SuperAdminPersona,
} from "@/lib/super-admin/types";

type SuperAdminContext = {
  is_super_admin: boolean;
  is_persona: boolean;
  super_admin_user_id: string;
  super_admin_auth_user_id: string;
  super_admin_username: string;
};

type ResolvedSuperAdmin = {
  // The browser's own cookie-backed client — whoever is signed in right now.
  browser: SupabaseClient;
  // A client authenticated as the super admin. The browser client itself
  // when the super admin is signed in; otherwise a cookie-less client
  // restored from the parked refresh token, so the browser's persona
  // session is untouched until the action decides to change it.
  superAdmin: SupabaseClient;
  // The super admin session to park if the browser moves to a persona.
  superAdminSession: Session;
  context: SuperAdminContext;
};

async function getContext(client: SupabaseClient): Promise<SuperAdminContext | null> {
  const { data, error } = await client.rpc("rpc_super_admin_context");
  if (error) return null;
  return ((data as SuperAdminContext[] | null) ?? [])[0] ?? null;
}

async function resolveSuperAdmin(): Promise<SuperAdminActionResult<ResolvedSuperAdmin>> {
  const browser = await createClient();
  const context = await getContext(browser);
  if (!context) return { ok: false, error: "notAuthorizedError" };

  if (context.is_super_admin) {
    const {
      data: { session },
    } = await browser.auth.getSession();
    if (!session) return { ok: false, error: "sessionExpiredError" };
    return { ok: true, data: { browser, superAdmin: browser, superAdminSession: session, context } };
  }

  const cookieStore = await cookies();
  const parked = cookieStore.get(SUPER_ADMIN_RETURN_COOKIE)?.value;
  if (!parked) return { ok: false, error: "sessionExpiredError" };

  const superAdmin = createStandaloneClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await superAdmin.auth.refreshSession({ refresh_token: parked });
  if (error || !data.session || !data.user) {
    return { ok: false, error: "sessionExpiredError" };
  }
  // The parked token must belong to the super admin who owns the persona
  // that is signed in now — never anyone else.
  if (data.user.id !== context.super_admin_auth_user_id) {
    return { ok: false, error: "notAuthorizedError" };
  }

  // Refresh tokens are single-use: park the rotated one immediately so a
  // later step failing can't strand the super admin.
  cookieStore.set(SUPER_ADMIN_RETURN_COOKIE, data.session.refresh_token, SUPER_ADMIN_COOKIE_OPTIONS);

  return { ok: true, data: { browser, superAdmin, superAdminSession: data.session, context } };
}

async function clearCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(SUPER_ADMIN_RETURN_COOKIE);
  cookieStore.delete(SUPER_ADMIN_PERSONAS_COOKIE);
}

export async function switchToPersona(personaUserId: string): Promise<SuperAdminActionResult> {
  const resolved = await resolveSuperAdmin();
  if (!resolved.ok) return resolved;
  const { browser, superAdmin, superAdminSession, context } = resolved.data;

  const [{ data: signIn, error: signInError }, { data: personas }] = await Promise.all([
    superAdmin.rpc("rpc_super_admin_persona_sign_in", { p_persona_user_id: personaUserId }),
    superAdmin.rpc("rpc_super_admin_personas"),
  ]);
  if (signInError) return { ok: false, error: mapSuperAdminRpcError(signInError.message) };
  const credentials = ((signIn as { auth_email: string; secret: string }[] | null) ?? [])[0];
  if (!credentials) return { ok: false, error: "genericError" };

  // Leaving one persona for another: end the old persona's session rather
  // than abandoning it. Local scope, so the super admin's is untouched.
  if (context.is_persona) {
    await browser.auth.signOut({ scope: "local" });
  }

  const { error } = await browser.auth.signInWithPassword({
    email: credentials.auth_email,
    password: credentials.secret,
  });
  if (error) return { ok: false, error: "genericError" };

  const snapshot: PersonaSnapshot = {
    owner: context.super_admin_username,
    personas: ((personas as SuperAdminPersona[] | null) ?? [])
      .filter((p) => p.status === "active")
      .map((p) => ({ id: p.persona_user_id, username: p.username, role: p.role })),
  };

  const cookieStore = await cookies();
  cookieStore.set(SUPER_ADMIN_RETURN_COOKIE, superAdminSession.refresh_token, SUPER_ADMIN_COOKIE_OPTIONS);
  cookieStore.set(SUPER_ADMIN_PERSONAS_COOKIE, JSON.stringify(snapshot), SUPER_ADMIN_COOKIE_OPTIONS);

  return { ok: true, data: null };
}

export async function returnToSuperAdmin(): Promise<SuperAdminActionResult> {
  const resolved = await resolveSuperAdmin();
  if (!resolved.ok) return resolved;
  const { browser, superAdminSession, context } = resolved.data;

  if (context.is_persona) {
    await browser.auth.signOut({ scope: "local" });
    const { error } = await browser.auth.setSession({
      access_token: superAdminSession.access_token,
      refresh_token: superAdminSession.refresh_token,
    });
    if (error) return { ok: false, error: "sessionExpiredError" };
  }

  await clearCookies();
  return { ok: true, data: null };
}

export async function resetPersona(personaUserId: string): Promise<SuperAdminActionResult<PersonaResetResult>> {
  const resolved = await resolveSuperAdmin();
  if (!resolved.ok) return resolved;

  const { data, error } = await resolved.data.superAdmin.rpc("rpc_super_admin_persona_reset", {
    p_persona_user_id: personaUserId,
  });
  if (error) return { ok: false, error: mapSuperAdminRpcError(error.message) };
  const result = ((data as PersonaResetResult[] | null) ?? [])[0];
  if (!result) return { ok: false, error: "genericError" };
  return { ok: true, data: result };
}

export async function createPersona(input: {
  role: string;
  orgUnitId: string;
  fullName?: string;
}): Promise<SuperAdminActionResult<{ username: string }>> {
  if (!isPersonaRole(input.role)) return { ok: false, error: "invalidRoleError" };

  const resolved = await resolveSuperAdmin();
  if (!resolved.ok) return resolved;

  const { data, error } = await resolved.data.superAdmin.rpc("rpc_super_admin_persona_create", {
    p_role: input.role,
    p_org_unit_id: input.orgUnitId,
    p_full_name: input.fullName?.trim() || null,
  });
  if (error) return { ok: false, error: mapSuperAdminRpcError(error.message) };
  const created = ((data as { persona_user_id: string; username: string }[] | null) ?? [])[0];
  if (!created) return { ok: false, error: "genericError" };
  return { ok: true, data: { username: created.username } };
}

// Called on sign-out, so a parked super admin session never outlives the
// browser session that parked it.
export async function clearSuperAdminCookies(): Promise<void> {
  await clearCookies();
}
