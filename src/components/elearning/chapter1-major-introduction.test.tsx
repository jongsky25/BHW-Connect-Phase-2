// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Chapter1MajorIntroduction } from "./chapter1-major-introduction";

const opened = vi.hoisted(() => new Set<string>());
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc: async (_name: string,
  args: { p_course_id: string; p_intro_id: string }) => {
  const key = `${args.p_course_id}:${args.p_intro_id}`;
  const first = !opened.has(key);
  opened.add(key);
  return { data: first, error: null };
} }) }));

const intro = { id: "chapter1-major-2-introduction", major_lesson: 2,
  body_en: "The English opening.", body_fil: "Ang panimulang Filipino." };
const props = { intro, courseId: "course-1", learnerId: "learner-1", language: "en" as const };

beforeEach(() => { window.localStorage.clear(); opened.clear(); });
afterEach(cleanup);

it("shows a directly opened major lesson introduction once and retains a review control", async () => {
  const first = render(<Chapter1MajorIntroduction {...props} />);
  expect(await screen.findByText("The English opening.")).toBeTruthy();
  first.unmount();
  window.localStorage.clear();
  render(<Chapter1MajorIntroduction {...props} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Review introduction" })).toBeTruthy());
  expect(screen.queryByText("The English opening.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Review introduction" }));
  expect(screen.getByText("The English opening.")).toBeTruthy();
});

it("scopes seen state to the learner", async () => {
  const first = render(<Chapter1MajorIntroduction {...props} />);
  await screen.findByText("The English opening.");
  first.unmount();
  opened.clear();
  render(<Chapter1MajorIntroduction {...props} learnerId="learner-2" />);
  expect(await screen.findByText("The English opening.")).toBeTruthy();
});
