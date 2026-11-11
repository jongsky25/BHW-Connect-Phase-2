import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import fil from "../../../messages/fil.json";
import { FLAG_ROLE_SCOPE } from "@/lib/flags/types";
import { getNavItems } from "@/lib/nav/nav-items";
import HomePage from "./page";
const state = vi.hoisted(() => ({ locale: "en", role: "bhw", enabled: true, preview: false, preferredName: null as string | null, preferenceError: false, actualRole: "bhw", status: "active" }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw Error(url); } }));
vi.mock("next-intl/server", () => ({ getLocale: async () => state.locale, getTranslations: async (namespace: string) => {
  const messages = (state.locale === "en" ? en : fil) as unknown as Record<string, Record<string, string>>;
  return (key: string, values?: Record<string, string>) => Object.entries(values ?? {}).reduce((message, [name, value]) => message.replace(`{${name}}`, value), messages[namespace][key]);
} }));
vi.mock("@/lib/auth/viewer", () => ({ getViewer: async () => ({ role: state.role, isPreview: state.preview, appUser: { id: "self", role: state.actualRole, status: state.status, full_name: "Fictional Rosa", onboarding_completed_at: "2026-10-01" } }) }));
vi.mock("@/lib/supabase/request", () => ({ getRequestFeatureFlags: async () => ({ elearning: state.enabled }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: async () => ({ data: state.preferredName, error: state.preferenceError ? { message: "Unavailable" } : null }) }) }));
vi.mock("@/lib/progress/load-manual-progress", () => ({ loadManualProgress: async () => [] }));
vi.mock("@/components/sign-out-button", () => ({ SignOutButton: () => <button>Sign out</button> }));
const assessorLoader = vi.hoisted(() => vi.fn(async () => []));
vi.mock("@/lib/progress/load-assessor-progress", () => ({ loadAssessorProgress: assessorLoader }));
afterEach(cleanup);
beforeEach(() => { assessorLoader.mockReset().mockResolvedValue([]); Object.assign(state, { locale: "en", role: "bhw", enabled: true, preview: false, preferredName: null, preferenceError: false, actualRole: "bhw", status: "active" }); });

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

it.each(["en", "fil"])("greets the user by their saved preference (%s)", async locale => {
  state.locale = locale; state.preferredName = "RJ"; render(await HomePage());
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(locale === "en" ? "Welcome, RJ!" : "Maligayang pagdating, RJ!");
});
it("uses the official name when the preference is unset, unavailable or in preview", async () => {
  for (const scenario of ["unset", "unavailable", "preview"]) {
    state.preferredName = scenario === "unset" ? null : "Private preference";
    state.preferenceError = scenario === "unavailable"; state.preview = scenario === "preview";
    render(await HomePage()); expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Welcome, Fictional Rosa!"); cleanup();
  }
});


it("loads the assessor's own study only for an active real assessor", async () => {
  state.role = state.actualRole = "assessor";
  render(await HomePage());
  expect(assessorLoader).toHaveBeenCalledWith(expect.anything(), "self");
});
it.each(["preview", "inactive", "disabled", "admin-preview", "bhw"])("does not load assessor progress for %s", async scenario => {
  state.role = state.actualRole = "assessor";
  if (scenario === "preview") state.preview = true;
  if (scenario === "inactive") state.status = "inactive";
  if (scenario === "disabled") state.enabled = false;
  if (scenario === "admin-preview") state.actualRole = "admin";
  if (scenario === "bhw") state.role = state.actualRole = "bhw";
  render(await HomePage());
  expect(assessorLoader).not.toHaveBeenCalled();
});
it("keeps both assessor destinations and reports a progress read failure", async () => {
  state.role = state.actualRole = "assessor";
  assessorLoader.mockRejectedValueOnce(new Error("offline"));
  render(await HomePage());
  expect(screen.getByRole("status")).toHaveTextContent("could not be loaded");
  expect(screen.getByRole("link", { name: /Go to Courses/ })).toHaveAttribute("href", "/courses");
  expect(screen.getByRole("link", { name: /Go to Assessments/ })).toHaveAttribute("href", "/assessments");
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});
const chapter = (key: string, done: number, total: number) => ({ id: key, number: 1, title_fil: key, title_en: key, href: `/training/p1/assessor/${key}`, counts: { done, total, percent: 0 }, missing: 0 });
const study = (programId: string, done: number, total: number, chapters = [chapter("chapter-1", done, total)]) => ({ programId, chapters, counts: { done, total, percent: 0 } });
it.each(["en", "fil"])("shows assessors only the two primary cards with saved study progress (%s)", async locale => {
  state.locale = locale; state.role = state.actualRole = "assessor";
  const english = locale === "en"; const messages = english ? en : fil;
  assessorLoader.mockResolvedValueOnce([study("p1", 30, 70, [chapter("chapter-1", 20, 20), chapter("chapter-2", 10, 50)]), study("p2", 12, 27, [])] as never);
  render(await HomePage());
  expect(screen.getAllByRole("heading", { level: 2 }).map(h => h.textContent)).toEqual(
    english ? ["Assessor Courses", "BHW Assessments"] : ["Mga Kurso ng Assessor", "Pagtatasa sa mga BHW"]);
  expect(screen.getByText("43%")).toBeInTheDocument();
  expect(screen.getByText(english ? "42 of 97 lessons completed" : "42 sa 97 aralin ang natapos")).toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42");
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", english ? "42/97 lessons" : "42/97 aralin");
  expect(screen.getByRole("link", { name: english ? /Go to Courses/ : /Pumunta sa Mga Kurso/ })).toHaveAttribute("href", "/training/p1/assessor/chapter-2");
  expect(screen.getByRole("link", { name: english ? /Go to Assessments/ : /Pumunta sa Pagtatasa/ })).toHaveAttribute("href", "/assessments");
  expect(screen.queryByRole("link", { name: messages.authHome.kbBrowseCta })).not.toBeInTheDocument();
});
it("sends finished study back to the first chapter for review", async () => {
  state.role = state.actualRole = "assessor";
  assessorLoader.mockResolvedValueOnce([study("p1", 70, 70, [chapter("chapter-1", 20, 20), chapter("chapter-2", 50, 50)])] as never);
  render(await HomePage());
  expect(screen.getByRole("link", { name: /Go to Courses/ })).toHaveAttribute("href", "/training/p1/assessor/chapter-1");
});
it("keeps the destination grid for BHWs and admins", async () => {
  for (const role of ["bhw", "admin"]) {
    state.role = state.actualRole = role; render(await HomePage());
    expect(screen.getByRole("link", { name: en.authHome.kbBrowseCta })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Go to Assessments/ })).not.toBeInTheDocument();
    cleanup();
  }
});
