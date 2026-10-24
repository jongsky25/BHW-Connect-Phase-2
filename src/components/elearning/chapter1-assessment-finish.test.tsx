import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Chapter1Assessment } from "./chapter1-assessment";

const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc: mock.rpc }) }));

function draft() {
  return {
    attempt_id: "draft", phase: "pretest", state: "draft", revision: 0, position: 29, language: "en",
    items: Array.from({ length: 30 }, (_, i) => ({ item_id: `q${i + 1}`, slot: `T${i + 1}`, lesson_keys: [],
      stem: { en: `Prompt ${i + 1}`, fil: `Tanong ${i + 1}` }, options: [{ id: "a", label: { en: "Answer", fil: "Sagot" } }] })),
    responses: Array.from({ length: 30 }, (_, i) => ({ item_id: `q${i + 1}`, kind: (i === 0 ? "unknown" : "choice") as "choice" | "unknown", option_id: i === 0 ? null : "a", marked: i === 7 })),
    score_percent: null, legacy_attempt_id: null,
  };
}
let stored: ReturnType<typeof draft>;
const props = {
  courseId: "course", chapterHref: "/chapter", locale: "en", sessionId: null, completed: true, contentApproved: true,
  initialState: { attempts: [{ attempt_id: "draft", phase: "pretest" as const, state: "draft", score_percent: null, legacy_attempt_id: null }], final_attempts: [] },
  orientation: { expectations: { en: "", fil: "" }, overview: { en: "", fil: "" }, recap: { en: "", fil: "" } },
};
beforeEach(() => {
  stored = draft();
  mock.rpc.mockReset().mockImplementation(async (name, args) => {
    if (name === "rpc_learner_assessment_save") {
      for (const next of args.p_changes) stored.responses = [...stored.responses.filter(r => r.item_id !== next.item_id), next];
      stored = { ...stored, position: args.p_position, revision: stored.revision + 1 };
    }
    return { data: structuredClone(stored), error: null };
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("keeps the finish guide available for pilot review after both tests are complete", () => {
  render(<Chapter1Assessment {...props} initialState={{ attempts: [], final_attempts: [
    { id: "pre", phase: "pretest", score_percent: 50 },
    { id: "post", phase: "posttest", score_percent: 80 },
  ] }} />);
  expect(screen.getByRole("complementary", { name: "How to finish" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Begin|Resume/ })).toBeNull();
  expect(mock.rpc).not.toHaveBeenCalled();
});

it.each(["en", "fil"])("explains the finish steps and hands the last question to review in %s", async locale => {
  render(<Chapter1Assessment {...props} locale={locale} />);
  expect(screen.getByRole("complementary", { name: locale === "en" ? "How to finish" : "Paano tapusin" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Resume pretest" : "Ipagpatuloy ang pretest" }));
  await screen.findByRole("heading", { name: locale === "en" ? "Prompt 30" : "Tanong 30" });
  expect(screen.queryByRole("button", { name: locale === "en" ? "Next" : "Susunod" })).toBeNull();
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "30");
  const review = screen.getByRole("button", { name: locale === "en" ? "Review all" : "Balikan ang lahat" });
  expect(review).toHaveClass("bg-primary");
  fireEvent.click(review);
  expect(screen.getByRole("heading", { name: locale === "en" ? "Review before submitting" : "Balikan bago isumite" })).toHaveFocus();
  const submit = screen.getByRole("button", { name: locale === "en" ? "Submit assessment" : "Isumite ang pagtatasa" });
  expect(submit).toBeEnabled(); // Unknown responses and review marks do not block completion.
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.click(submit);
  expect(confirm).toHaveBeenCalledOnce();
  expect(mock.rpc.mock.calls.some(([name]) => name === "rpc_learner_assessment_submit")).toBe(false);
});

it("separates choice/unknown/blank/marked counts and returns to the first missing response", async () => {
  stored.responses = stored.responses.filter(r => r.item_id !== "q5");
  render(<Chapter1Assessment {...props} assessor />);
  fireEvent.click(screen.getByRole("button", { name: "Resume pretest" }));
  await screen.findByRole("heading", { name: "Prompt 30" });
  expect(screen.getByText("28 answered · 1 don't know yet · 1 unanswered · 1 marked for review")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Review all" }));
  expect(screen.getByRole("button", { name: "Submit assessment" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Go to first unanswered" }));
  await screen.findByRole("heading", { name: "Prompt 5" });
  expect(stored.position).toBe(4);
  expect(mock.rpc).toHaveBeenCalledWith("rpc_learner_assessment_save", expect.objectContaining({ p_changes: [], p_position: 4 }));
  expect(stored.responses).toHaveLength(29);
});

it("keeps review open after a failed marked-question jump, then retries without changing answers", async () => {
  render(<Chapter1Assessment {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Resume pretest" }));
  await screen.findByRole("heading", { name: "Prompt 30" });
  fireEvent.click(screen.getByRole("button", { name: "Review all" }));
  const before = structuredClone(stored.responses);
  mock.rpc.mockResolvedValueOnce({ data: null, error: new Error("offline") });
  fireEvent.click(screen.getByRole("button", { name: "Go to first review mark" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("heading", { name: "Review before submitting" })).toBeInTheDocument();
  expect(stored.position).toBe(29);
  fireEvent.click(screen.getByRole("button", { name: "Go to first review mark" }));
  await screen.findByRole("heading", { name: "Prompt 8" });
  expect(stored.responses).toEqual(before);
});

it.each([false, true])("does not claim completion while a last-question change is unsaved (previously complete=%s)", async complete => {
  if (!complete) stored.responses = stored.responses.filter(r => r.item_id !== "q30");
  else stored.responses = stored.responses.map(r => r.item_id === "q30" ? { ...r, kind: "unknown", option_id: null } : r);
  render(<Chapter1Assessment {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Resume pretest" }));
  await screen.findByRole("heading", { name: "Prompt 30" });
  mock.rpc.mockResolvedValueOnce({ data: null, error: new Error("offline") });
  fireEvent.click(screen.getByRole("radio", { name: "Answer" }));
  await screen.findByRole("alert");
  expect(screen.queryByText(/All 30 responses are saved/)).toBeNull();
  expect(screen.getByRole("button", { name: "Review all" })).toBeDisabled();
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", complete ? "30" : "29");
  fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Review all" })).toBeEnabled());
  expect(screen.getByText(/All 30 responses are saved/)).toBeInTheDocument();
});
