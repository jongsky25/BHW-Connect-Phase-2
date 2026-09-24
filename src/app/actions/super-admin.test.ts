// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPersona, returnToSuperAdmin, switchToPersona } from "./super-admin";

const SUPER_ADMIN_CONTEXT = {
  is_super_admin: true,
  is_persona: false,
  super_admin_user_id: "sa-user",
  super_admin_auth_user_id: "sa-auth",
  super_admin_username: "rcventura",
};
const PERSONA_CONTEXT = { ...SUPER_ADMIN_CONTEXT, is_super_admin: false, is_persona: true };

const state = vi.hoisted(() => ({
  context: null as unknown,
  cookies: new Map<string, string>(),
  browserRpc: vi.fn(),
  standaloneRpc: vi.fn(),
  refreshSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  setSession: vi.fn(),
}));

function rpcHandler(name: string) {
  if (name === "rpc_super_admin_context") return { data: state.context ? [state.context] : [], error: null };
  if (name === "rpc_super_admin_persona_sign_in")
    return { data: [{ auth_email: "rcventura.bhw@bhw.local", secret: "s3cret" }], error: null };
  if (name === "rpc_super_admin_personas")
    return {
      data: [{ persona_user_id: "p-bhw", username: "rcventura.bhw", role: "bhw", status: "active" }],
      error: null,
    };
  if (name === "rpc_super_admin_persona_create")
    return { data: [{ persona_user_id: "p-new", username: "rcventura.assessor" }], error: null };
  return { data: null, error: { message: "unexpected" } };
}

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (state.cookies.has(name) ? { value: state.cookies.get(name) } : undefined),
    set: (name: string, value: string) => state.cookies.set(name, value),
    delete: (name: string) => state.cookies.delete(name),
  }),
}));

vi.mock("@/lib/supabase/env", () => ({ getSupabaseUrl: () => "http://x", getSupabaseAnonKey: () => "anon" }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: state.browserRpc,
    auth: {
      getSession: async () => ({ data: { session: { access_token: "sa-access", refresh_token: "sa-refresh" } } }),
      signInWithPassword: state.signInWithPassword,
      signOut: state.signOut,
      setSession: state.setSession,
    },
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: state.standaloneRpc, auth: { refreshSession: state.refreshSession } }),
}));

beforeEach(() => {
  state.cookies.clear();
  for (const fn of [state.browserRpc, state.standaloneRpc, state.refreshSession, state.signInWithPassword, state.signOut, state.setSession]) {
    fn.mockReset();
  }
  state.browserRpc.mockImplementation(async (name: string) => rpcHandler(name));
  state.standaloneRpc.mockImplementation(async (name: string) => rpcHandler(name));
  state.signInWithPassword.mockResolvedValue({ error: null });
  state.signOut.mockResolvedValue({ error: null });
  state.setSession.mockResolvedValue({ error: null });
});

describe("switchToPersona", () => {
  it("parks the super admin's session and signs the browser in as the persona", async () => {
    state.context = SUPER_ADMIN_CONTEXT;
    const result = await switchToPersona("p-bhw");
    expect(result.ok).toBe(true);
    expect(state.signInWithPassword).toHaveBeenCalledWith({ email: "rcventura.bhw@bhw.local", password: "s3cret" });
    expect(state.cookies.get("bhw_super_admin_return")).toBe("sa-refresh");
    expect(JSON.parse(state.cookies.get("bhw_super_admin_personas")!)).toEqual({
      owner: "rcventura",
      personas: [{ id: "p-bhw", username: "rcventura.bhw", role: "bhw" }],
    });
  });

  it("refuses a user who is neither a super admin nor a persona", async () => {
    state.context = null;
    const result = await switchToPersona("p-bhw");
    expect(result).toEqual({ ok: false, error: "notAuthorizedError" });
    expect(state.signInWithPassword).not.toHaveBeenCalled();
  });

  it("as a persona, restores the super admin from the parked token before switching", async () => {
    state.context = PERSONA_CONTEXT;
    state.cookies.set("bhw_super_admin_return", "parked");
    state.refreshSession.mockResolvedValue({
      data: { session: { access_token: "a2", refresh_token: "rotated" }, user: { id: "sa-auth" } },
      error: null,
    });
    const result = await switchToPersona("p-bhw");
    expect(result.ok).toBe(true);
    expect(state.refreshSession).toHaveBeenCalledWith({ refresh_token: "parked" });
    expect(state.standaloneRpc).toHaveBeenCalledWith("rpc_super_admin_persona_sign_in", { p_persona_user_id: "p-bhw" });
    expect(state.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(state.cookies.get("bhw_super_admin_return")).toBe("rotated");
  });

  it("never honours a parked token that belongs to someone other than the persona's owner", async () => {
    state.context = PERSONA_CONTEXT;
    state.cookies.set("bhw_super_admin_return", "parked");
    state.refreshSession.mockResolvedValue({
      data: { session: { access_token: "a2", refresh_token: "rotated" }, user: { id: "someone-else" } },
      error: null,
    });
    const result = await switchToPersona("p-bhw");
    expect(result).toEqual({ ok: false, error: "notAuthorizedError" });
    expect(state.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe("returnToSuperAdmin", () => {
  it("swaps the browser back to the super admin session and clears the cookies", async () => {
    state.context = PERSONA_CONTEXT;
    state.cookies.set("bhw_super_admin_return", "parked");
    state.cookies.set("bhw_super_admin_personas", "{}");
    state.refreshSession.mockResolvedValue({
      data: { session: { access_token: "a2", refresh_token: "rotated" }, user: { id: "sa-auth" } },
      error: null,
    });
    const result = await returnToSuperAdmin();
    expect(result.ok).toBe(true);
    expect(state.setSession).toHaveBeenCalledWith({ access_token: "a2", refresh_token: "rotated" });
    expect(state.cookies.size).toBe(0);
  });

  it("reports an expired session when nothing is parked", async () => {
    state.context = PERSONA_CONTEXT;
    expect(await returnToSuperAdmin()).toEqual({ ok: false, error: "sessionExpiredError" });
  });
});

describe("createPersona", () => {
  it("rejects an unknown role before calling the database", async () => {
    state.context = SUPER_ADMIN_CONTEXT;
    expect(await createPersona({ role: "owner", orgUnitId: "o" })).toEqual({ ok: false, error: "invalidRoleError" });
    expect(state.browserRpc).not.toHaveBeenCalled();
  });

  it("creates a persona as the super admin", async () => {
    state.context = SUPER_ADMIN_CONTEXT;
    expect(await createPersona({ role: "assessor", orgUnitId: "o" })).toEqual({
      ok: true,
      data: { username: "rcventura.assessor" },
    });
  });
});
