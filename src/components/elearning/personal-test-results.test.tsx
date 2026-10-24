import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PersonalTestResults } from "./personal-test-results";
import type { PersonalTestResult } from "@/lib/elearning/test-results";
import { reviewRawScore } from "@/lib/elearning/test-results";
afterEach(cleanup);
const result: PersonalTestResult = { id: "a", course_id: "course", title_en: "Chapter One", title_fil: "Kabanata Uno", program_id: "program", chapter_key: "chapter-1", phase: "pretest", generation: "versioned", score_percent: 80, correct_count: 24, question_count: 30, submitted_at: "2026-10-24T00:00:00Z", form_id: "form-v4", release_id: "v4", review_attempt_id: null };
it("shows exact raw results and keeps pretest keys unavailable while linking posttest review", () => {
  render(<PersonalTestResults locale="en" history={{ items: [result, { ...result, id: "b", phase: "posttest", review_attempt_id: "final" }], has_more: true }} />);
  expect(screen.getAllByText("24/30 correct · 80%")).toHaveLength(2);
  expect(screen.getByText(/baseline answer keys are not shown/)).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Review answers and explanations" })).toHaveLength(1);
  expect(screen.getByRole("link", { name: "Review answers and explanations" })).toHaveAttribute("href", "/courses/course/assessment/review/final");
  expect(screen.getByRole("link", { name: "Older results" })).toHaveAttribute("href", "/my-results?page=2");
});
it("preserves legacy percentages without inventing raw counts or explanations", () => {
  render(<PersonalTestResults locale="fil" page={2} history={{ items: [{ ...result, generation: "legacy_bhw", phase: "posttest", correct_count: null, question_count: null, review_attempt_id: "old" }], has_more: false }} />);
  expect(screen.getByText("Naka-save na iskor: 80%")).toBeInTheDocument();
  expect(screen.getByText(/Hindi matiyak ang eksaktong raw count/)).toBeInTheDocument();
  expect(screen.queryByText(/24\/30/)).toBeNull();
  expect(screen.getByRole("link", { name: "Tingnan ang mga dating naitalang sagot" })).toHaveAttribute("href", "/courses/course/assessment/review/old");
  expect(screen.getByRole("link", { name: "Mas bagong resulta" })).toHaveAttribute("href", "/my-results?page=1");
});
it("handles accounts without completed results", () => {
  render(<PersonalTestResults locale="en" history={{ items: [], has_more: false }} />);
  expect(screen.getByText(/No completed tests on this page/)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Older results" })).toBeNull();
});
it("derives a review count only from complete unique evidence agreeing with the stored score", () => {
  const items = [{ item_id: "a", correct_option_id: "yes" }, { item_id: "b", correct_option_id: "yes" }];
  const responses = [{ item_id: "a", kind: "choice", option_id: "yes" }, { item_id: "b", kind: "unknown", option_id: null }];
  expect(reviewRawScore(items, responses, 50)).toEqual({ correct: 1, total: 2 });
  expect(reviewRawScore(items, responses, 100)).toBeNull();
  expect(reviewRawScore(items, responses.slice(0, 1), 50)).toBeNull();
  expect(reviewRawScore(items, [responses[0], responses[0]], 100)).toBeNull();
});
