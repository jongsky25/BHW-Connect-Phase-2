import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AssessmentsPage from "./page";

const state = vi.hoisted(() => ({
  role: "assessor", level: "city_municipal" as string | null, enabled: true,
  reads: [] as string[],
}));
const tables: Record<string, unknown> = {
  assessments: [],
  org_units: { name: "Fictional City" },
  training_programs: { id: "prog" },
  training_program_chapters: [
    { chapter_key: "chapter-1", position: 0, title_fil: "K1", title_en: "BHWs and Their Barangay", course_id: "c1" },
    { chapter_key: "chapter-2", position: 1, title_fil: "K2", title_en: "Draft chapter", course_id: "c2" },
  ],
  courses: [{ id: "c1" }],
  course_modules: [{ id: "m1", position: 0, title_fil: "T", title_en: "The Roles of a BHW" }],
};
function builder(table: string) {
  state.reads.push(table);
  const result = { data: tables[table], error: null };
  const chain: Record<string, unknown> = {};
  for (const name of ["select", "eq", "in", "not", "order", "limit", "returns", "maybeSingle"]) chain[name] = () => chain;
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw Error(`redirect:${url}`); } }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en" }));
vi.mock("@/lib/supabase/request", () => ({ getRequestFeatureFlags: async () => ({ elearning: state.enabled }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: builder }) }));
vi.mock("@/lib/auth/viewer", () => ({ getViewer: async () => ({ role: state.role, isPreview: false,
  appUser: { id: "self", role: state.role, status: "active", org_unit_id: "unit", org_unit_level: state.level } }) }));
vi.mock("@/components/elearning/assessments-console", () => ({
  AssessmentsConsole: ({ hub }: { hub: React.ReactNode }) => <div>{hub}</div>,
}));

afterEach(cleanup);
beforeEach(() => Object.assign(state, { role: "assessor", level: "city_municipal", enabled: true, reads: [] }));

it("auto-selects the only published chapter and links its subchapters to the BHWs section", async () => {
  render(await AssessmentsPage({ searchParams: Promise.resolve({}) }));
  expect(screen.queryByRole("link", { name: /Draft chapter/ })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /1\.1 The Roles of a BHW/ })).toHaveAttribute("href", "/training/prog/chapter-1/m1?view=bhws");
  expect(screen.getByText("Fictional City")).toBeInTheDocument();
});

it.each([null, "national"])("blocks assessment entry when the assignment level is %s", async level => {
  state.level = level;
  render(await AssessmentsPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("alert")).toHaveTextContent("No barangay assignment found");
  expect(state.reads).not.toContain("training_program_chapters");
});

it.each(["bhw", "admin"])("redirects a %s away from the assessor hub", async role => {
  state.role = role;
  await expect(AssessmentsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/home");
});
