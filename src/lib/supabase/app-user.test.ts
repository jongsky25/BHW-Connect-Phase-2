import { describe, expect, it } from "vitest";
import { APP_USER_HEADER, forwardedAppUser, type AppUser } from "./app-user";

const user: AppUser = {
  id: "u1",
  auth_user_id: "auth-1",
  username: "bhw.stable",
  full_name: "Ma. Niña Peñaflor",
  role: "bhw",
  org_unit_id: "o1",
  status: "active",
  must_change_password: false,
  consented_at: "2026-09-01T00:00:00Z",
  language: "fil",
  a11y_settings: { theme: "dark" },
  onboarding_progress: {},
  onboarding_completed_at: null,
  notifications_last_read_at: null,
  org_unit_level: "barangay",
};

// Mirrors what withAppUserHeaders() in ./middleware.ts sets.
function headersFor(value: unknown) {
  return new Headers({ [APP_USER_HEADER]: encodeURIComponent(JSON.stringify(value)) });
}

describe("forwardedAppUser", () => {
  it("round-trips the profile middleware forwarded, non-ASCII names included", () => {
    expect(forwardedAppUser(headersFor(user), "auth-1")).toEqual(user);
  });

  it("ignores a profile that belongs to another session", () => {
    expect(forwardedAppUser(headersFor(user), "auth-2")).toBeNull();
  });

  it("returns null when the header is absent or malformed", () => {
    expect(forwardedAppUser(new Headers(), "auth-1")).toBeNull();
    expect(forwardedAppUser(new Headers({ [APP_USER_HEADER]: "%E0%A4%A" }), "auth-1")).toBeNull();
    expect(forwardedAppUser(new Headers({ [APP_USER_HEADER]: "not-json" }), "auth-1")).toBeNull();
  });
});
