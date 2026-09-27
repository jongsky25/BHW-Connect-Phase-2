import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "./middleware";

// RFT B1 (docs/role-feature-toggles-plan.md §6 B1): only an admin's own
// `bhw_view_as` preview cookie is ever honoured, and the role it resolves
// to (docs §4.4) is what the rest of the app — nav, flags, gating — reads
// from the `x-app-effective-role`/`x-app-preview` headers this file sets.

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

type FlagRow = { key: string; enabled: boolean; disabled_roles: string[] };

let authUser: { id: string } | null = { id: "auth-1" };
let appUserRow: {
  id: string;
  auth_user_id: string;
  username: string;
  full_name: string;
  role: string;
  org_unit_id: string;
  status: string;
  must_change_password: boolean;
  consented_at: string | null;
  language: string;
  a11y_settings: unknown;
  onboarding_progress: unknown;
  onboarding_completed_at: string | null;
  notifications_last_read_at: string | null;
  org_unit_level: string | null;
};
let flagRows: FlagRow[];

function resetFixtures() {
  authUser = { id: "auth-1" };
  appUserRow = {
    id: "u1",
    auth_user_id: "auth-1",
    username: "admin.stable",
    full_name: "Admin Stable",
    role: "admin",
    org_unit_id: "org-1",
    status: "active",
    must_change_password: false,
    consented_at: "2026-01-01T00:00:00Z",
    language: "en",
    a11y_settings: {},
    onboarding_progress: {},
    onboarding_completed_at: null,
    notifications_last_read_at: null,
    org_unit_level: null,
  };
  flagRows = [];
}
resetFixtures();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: authUser } }),
      signOut: async () => undefined,
    },
    from: () => ({
      select: () => ({ eq: () => ({ gt: () => ({ count: 0 }) }) }),
    }),
  }),
}));

vi.mock("./app-user", () => ({
  getAppUser: async () => appUserRow,
}));

vi.mock("../flags/get-flags", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../flags/get-flags")>();
  return {
    ...actual,
    fetchFlagRows: async () => flagRows,
  };
});

function makeRequest(pathname: string, cookieHeader?: string) {
  return new NextRequest(`http://localhost${pathname}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

beforeEach(() => {
  resetFixtures();
});

describe("updateSession preview cookie (RFT B1)", () => {
  it("ignores and deletes a preview cookie on a non-admin account", async () => {
    appUserRow.role = "bhw";
    const response = await updateSession(makeRequest("/home", "bhw_view_as=assessor"));

    expect(response.headers.get("x-middleware-request-x-app-effective-role")).toBe("bhw");
    expect(response.headers.get("x-middleware-request-x-app-preview")).toBe("0");
    expect(response.cookies.get("bhw_view_as")?.value).toBe("");
  });

  it("ignores and deletes an invalid role value, even for an admin", async () => {
    appUserRow.role = "admin";
    const response = await updateSession(makeRequest("/home", "bhw_view_as=super-manager"));

    expect(response.headers.get("x-middleware-request-x-app-effective-role")).toBe("admin");
    expect(response.headers.get("x-middleware-request-x-app-preview")).toBe("0");
    expect(response.cookies.get("bhw_view_as")?.value).toBe("");
  });

  it("resolves an admin's valid preview cookie to the previewed role's flags", async () => {
    appUserRow.role = "admin";
    flagRows = [{ key: "offline_pwa", enabled: true, disabled_roles: ["bhw"] }];

    const withoutPreview = await updateSession(makeRequest("/home"));
    expect(withoutPreview.headers.get("x-middleware-request-x-app-offline-pwa")).toBe("1");

    const previewing = await updateSession(makeRequest("/home", "bhw_view_as=bhw"));
    expect(previewing.headers.get("x-middleware-request-x-app-effective-role")).toBe("bhw");
    expect(previewing.headers.get("x-middleware-request-x-app-preview")).toBe("1");
    // The master switch is on but bhw is in disabled_roles: the previewed
    // role sees it off, exactly as a real BHW would (plan §4.2).
    expect(previewing.headers.get("x-middleware-request-x-app-offline-pwa")).toBe("0");
  });

  it("redirects /admin/* to /home?preview=1 while previewing", async () => {
    appUserRow.role = "admin";
    const response = await updateSession(makeRequest("/admin/flags", "bhw_view_as=bhw"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/home");
    expect(location.searchParams.get("preview")).toBe("1");
  });
});
