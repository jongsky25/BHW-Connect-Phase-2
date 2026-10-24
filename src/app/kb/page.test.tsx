import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import fil from "../../../messages/fil.json";
import KbBrowsePage from "./page";
import KbCategoryPage from "./[slug]/page";
const state = vi.hoisted(() => ({ locale: "en", authed: true, courses: true, tables: [] as string[], rows: [
  { id: "mch", slug: "mch", name_en: "Maternal & Child Health", name_fil: "Kalusugan ng Ina at Bata" },
  { id: "hhp", slug: "hhp-m1-care-pathway", name_en: "Module 1 — HHP+ and PhilPEN", name_fil: "Modyul 1 — HHP+ at PhilPEN" },
  { id: "manual", slug: "day1-m1-tungkulin", name_en: "Module 1 — BHW roles", name_fil: "Modyul 1 — Tungkulin ng BHW" },
  { id: "legacy", slug: "day1-m3-ra7883", name_en: "Module 3 — RA 7883", name_fil: "Modyul 3 — RA 7883" },
] }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw Error(url); }, notFound: () => { throw Error("404"); } }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next-intl/server", () => ({ getLocale: async () => state.locale, getTranslations: async (namespace: string) => {
  const messages = (state.locale === "en" ? en : fil) as unknown as Record<string, Record<string, string>>;
  return (key: string) => messages[namespace][key];
} }));
vi.mock("@/lib/supabase/request", () => ({
  getRequestAuthUser: async () => ({ data: { user: state.authed ? { id: "self" } : null } }),
  getRequestAppUser: async () => ({ onboarding_progress: { kb: true } }),
  getRequestFeatureFlags: async () => ({ kb_articles: false, elearning: state.courses }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: (table: string) => {
  state.tables.push(table); let slug = "";
  const q = { select: () => q, order: () => q, returns: async () => ({ data: table === "kb_categories" ? state.rows : [{ id: "entry", question_en: "Original question", question_fil: "Orihinal na tanong", answer_en: "Original answer", answer_fil: "Orihinal na sagot" }] }),
    eq: (key: string, value: string) => { if (key === "slug") slug = value; return q; }, is: () => q,
    maybeSingle: async () => ({ data: state.rows.find(row => row.slug === slug) }) };
  return q;
} }) }));
afterEach(cleanup);
beforeEach(() => { state.locale = "en"; state.authed = true; state.courses = true; state.tables = []; });
it.each(["en", "fil"])("separates source sequences and retains unnumbered general topics (%s)", async locale => {
  state.locale = locale; const before = JSON.stringify(state.rows); render(await KbBrowsePage());
  const manual = screen.getByRole("region", { name: /BHW Reference Manual/ });
  const hhp = screen.getByRole("region", { name: "HHP+ / PhilPEN" });
  const others = screen.getByRole("region", { name: locale === "en" ? "Additional health topics" : "Iba pang paksa sa kalusugan" });
  expect(within(manual).getByRole("link")).toHaveAccessibleDescription(locale === "en" ? "Chapter 1 · Module 1 of 9" : "Kabanata 1 · Modyul 1 sa 9");
  expect(within(hhp).getByRole("link")).toHaveAccessibleDescription(locale === "en" ? "HHP+ / PhilPEN · Module 1 of 6" : "HHP+ / PhilPEN · Modyul 1 sa 6");
  expect(within(others).getByRole("link", { name: "RA 7883" })).toHaveAttribute("href", "/kb/day1-m3-ra7883");
  expect(others).not.toHaveTextContent(/Chapter|Kabanata/);
  expect(JSON.stringify(state.rows)).toBe(before);
});
it("keeps category context and the published answer while respecting the article flag", async () => {
  render(await KbCategoryPage({ params: Promise.resolve({ slug: "hhp-m1-care-pathway" }) }));
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("HHP+ and PhilPEN");
  expect(screen.getByText("HHP+ / PhilPEN · Module 1 of 6")).toBeInTheDocument();
  expect(screen.getByText("Original answer")).toBeInTheDocument();
  expect(state.tables).not.toContain("kb_articles");
});
it("requires authentication before listing categories", async () => {
  state.authed = false; await expect(KbBrowsePage()).rejects.toThrow("/login"); expect(state.tables).toEqual([]);
});

it("only offers the Courses shortcut when learning is available", async () => {
  state.courses = false; render(await KbBrowsePage());
  expect(screen.queryByRole("link", { name: en.kb.openCourses })).not.toBeInTheDocument();
});
