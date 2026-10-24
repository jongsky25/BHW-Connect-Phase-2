import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ReviewPage from "./page";
const state = vi.hoisted(() => ({ role: "assessor", rpc: vi.fn() }));
vi.mock("@/lib/auth/viewer", () => ({ getViewer: async () => ({ appUser: { id: "self", status: "active" }, role: state.role }) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en" }));
vi.mock("next/navigation", () => ({ redirect: (p: string) => { throw new Error(p); }, notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: state.rpc, from: () => {
  const q = { select: () => q, eq: () => q, in: async () => ({ data: [] }), maybeSingle: async () => ({ data: { program_id: "p", chapter_key: "chapter-1" } }) }; return q;
} }) }));
const review = { score_percent: 50, form_id: "frozen-form", release_id: "release", items: [1,2].map(i => ({ item_id: `q${i}`, slot: `T${i}`, stem: { en: `Prompt ${i}`, fil: `Tanong ${i}` }, rationale: { en: `Reason ${i}`, fil: `Dahilan ${i}` }, correct_option_id: "a", lesson_keys: [], options: [{ id: "a", label: { en: "Answer A", fil: "Sagot A" } }] })), responses: [{ item_id: "q1", kind: "choice", option_id: "a" }, { item_id: "q2", kind: "unknown", option_id: null }] };
beforeEach(() => { state.role = "assessor"; state.rpc.mockReset().mockResolvedValue({ data: review, error: null }); });
afterEach(cleanup);
const page = (view = "all") => ReviewPage({ params: Promise.resolve({ id: "course", attemptId: "final" }), searchParams: Promise.resolve({ view }) });
it("shows exact post-test raw counts and filters without renumbering saved items", async () => {
  render(await page("needs-review"));
  expect(screen.getByText("1/2 correct")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "1. Prompt 1" })).toBeNull();
  expect(screen.getByRole("heading", { name: "2. Prompt 2" })).toBeInTheDocument();
  expect(screen.getByText("Reason 2")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Needs review (1)" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: "← My test results" })).toHaveAttribute("href", "/my-results");
});
it("keeps review denied when the existing RPC rejects an unavailable or baseline attempt", async () => {
  state.rpc.mockResolvedValue({ data: null, error: new Error("baseline keys withheld") });
  await expect(page()).rejects.toThrow("NOT_FOUND");
});
it("retains historical percentages and provenance limits without fabricating raw counts", async () => {
  state.role = "bhw";
  state.rpc.mockImplementation(async name => name === "rpc_legacy_posttest_review" ? { data: { generation: "legacy", score_percent: 60, form_membership_known: false, entries: [] }, error: null } : { data: null, error: new Error("old") });
  render(await page());
  expect(screen.getByText(/Stored final score/)).toHaveTextContent("60%");
  expect(screen.getByText(/original served form and scoring membership were not saved/)).toBeInTheDocument();
  expect(screen.queryByText(/\d+\/\d+ correct/)).toBeNull();
});
