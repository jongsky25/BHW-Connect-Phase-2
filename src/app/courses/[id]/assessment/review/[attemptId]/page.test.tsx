import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ReviewPage from "./page";
const state = vi.hoisted(() => ({ role: "assessor", locale: "en", rpc: vi.fn() }));
vi.mock("@/lib/auth/viewer", () => ({ getViewer: async () => ({ appUser: { id: "self", status: "active" }, role: state.role }) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => state.locale }));
vi.mock("next/navigation", () => ({ redirect: (p: string) => { throw new Error(p); }, notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: state.rpc, from: () => {
  const q = { select: () => q, eq: () => q, in: () => q, limit: async () => ({ data: [] }), maybeSingle: async () => ({ data: { program_id: "p", chapter_key: "chapter-1" } }) }; return q;
} }) }));
const review = { score_percent: 50, form_id: "frozen-form", release_id: "release", items: [1,2].map(i => ({ item_id: `q${i}`, slot: `T${i}`, stem: { en: `Prompt ${i}`, fil: `Tanong ${i}` }, rationale: { en: `Reason ${i}`, fil: `Dahilan ${i}` }, correct_option_id: "a", lesson_keys: [], options: [{ id: "a", label: { en: "Answer A", fil: "Sagot A" } }] })), responses: [{ item_id: "q1", kind: "choice", option_id: "a" }, { item_id: "q2", kind: "unknown", option_id: null }] };
beforeEach(() => { state.role = "assessor"; state.locale = "en"; state.rpc.mockReset().mockResolvedValue({ data: review, error: null }); });
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
  expect(screen.queryByText("Read the Reference Manual")).toBeNull();
});
it("shows a saved assessor post-test key with a clear limit on historical explanations", async () => {
  state.rpc.mockImplementation(async name => name === "rpc_legacy_assessor_posttest_review" ? { data: {
    generation: "legacy_assessor", score_percent: 100, form_membership_known: true,
    entries: [{ question_id: "q", status: "recoverable", prompt_en: "A field question", prompt_fil: "Tanong",
      options: [{ en: "Safe", fil: "Ligtas" }, { en: "Unsafe", fil: "Di ligtas" }],
      selected_option_index: 0, correct_option_index: 0, matches_stored_key: true }],
  }, error: null } : { data: null, error: new Error("old") });
  render(await page());
  expect(state.rpc).toHaveBeenCalledWith("rpc_legacy_assessor_posttest_review", { p_final_attempt_id: "final" });
  expect(screen.getByText(/questions come from your saved post-test form/)).toBeInTheDocument();
  expect(screen.getByText(/Authored explanations were not saved/)).toBeInTheDocument();
  expect(screen.getByText(/Stored key/)).toHaveTextContent("Safe");
});
it("shows the saved wrong-choice explanation and labels later manual reading", async () => {
  const saved = { ...review, items: review.items.map(item => ({ ...item,
    lesson_keys: ["bhw-roles-hepo"], options: [...item.options,
      { id: "b", label: { en: "Unsafe choice", fil: "Di ligtas" },
        distractor_rationale: { en: "Saved reason B is unsafe", fil: "Naka-save na paliwanag" } }],
  })), responses: [review.responses[0], { item_id: "q2", kind: "choice", option_id: "b" }] };
  state.rpc.mockResolvedValue({ data: saved, error: null });
  render(await page("needs-review"));
  expect(screen.getByText(/Why your choice was incorrect/).parentElement).toHaveTextContent("Saved reason B is unsafe");
  expect(screen.getByText(/references were added later/)).toBeInTheDocument();
  expect(screen.getByText("Read the Reference Manual")).toBeInTheDocument();
  expect(screen.getByText(/Your response/)).toHaveTextContent("Unsafe choice");
  expect(screen.getByText(/Correct response/)).toHaveTextContent("Answer A");
});

it("localizes saved review explanations and keeps absent choice explanations absent", async () => {
  state.locale = "fil";
  render(await page("needs-review"));
  expect(screen.getByText(/Naka-save na paliwanag/).parentElement).toHaveTextContent("Dahilan 2");
  expect(screen.queryByText(/Bakit mali ang iyong pinili/)).toBeNull();
});
