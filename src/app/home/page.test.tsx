import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import fil from "../../../messages/fil.json";
import { FLAG_ROLE_SCOPE } from "@/lib/flags/types";
import { getNavItems } from "@/lib/nav/nav-items";
import HomePage from "./page";
const state = vi.hoisted(() => ({ locale: "en", role: "bhw", enabled: true }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw Error(url); } }));
vi.mock("next-intl/server", () => ({ getLocale: async () => state.locale, getTranslations: async (namespace: string) => {
  const messages = (state.locale === "en" ? en : fil) as unknown as Record<string, Record<string, string>>;
  return (key: string) => messages[namespace][key];
} }));
vi.mock("@/lib/auth/viewer", () => ({ getViewer: async () => ({ role: state.role, appUser: { id: "self", full_name: "Fictional Rosa", onboarding_completed_at: "2026-10-01" } }) }));
vi.mock("@/lib/supabase/request", () => ({ getRequestFeatureFlags: async () => ({ elearning: state.enabled }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/progress/load-manual-progress", () => ({ loadManualProgress: async () => [] }));
vi.mock("@/components/sign-out-button", () => ({ SignOutButton: () => <button>Sign out</button> }));
afterEach(cleanup);
beforeEach(() => Object.assign(state, { locale: "en", role: "bhw", enabled: true }));

it.each(["en", "fil"])("describes visible destinations while retaining their concise accessible names (%s)", async locale => {
  state.locale = locale; const messages = locale === "en" ? en : fil;
  render(await HomePage());
  const kb = screen.getByRole("link", { name: messages.authHome.kbBrowseCta });
  expect(kb).toHaveAttribute("href", "/kb");
  expect(kb).toHaveAccessibleDescription(messages.destinations.kb);
  expect(screen.getByRole("link", { name: messages.authHome.coursesCta })).toHaveAccessibleDescription(messages.destinations.courses);
  expect(screen.queryByRole("link", { name: messages.authHome.adminConsoleCta })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: messages.authHome.assessmentsCta })).not.toBeInTheDocument();
});
it("does not expose a disabled destination or its description", async () => {
  state.enabled = false; render(await HomePage());
  expect(screen.queryByRole("link", { name: en.authHome.coursesCta })).not.toBeInTheDocument();
  expect(screen.queryByText(en.destinations.courses)).not.toBeInTheDocument();
});
it("provides bilingual explanations for every role-allowed navigation destination", () => {
  const flags = Object.fromEntries(Object.keys(FLAG_ROLE_SCOPE).map(key => [key, true])) as Parameters<typeof getNavItems>[0]["flags"];
  for (const role of ["bhw", "assessor", "admin", "designer"] as const) {
    for (const item of getNavItems({ role, flags })) for (const messages of [en, fil]) {
      expect(messages.destinations[item.id as keyof typeof messages.destinations]).toBeTruthy();
    }
  }
});
