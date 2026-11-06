import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { AssessorStudyProgress } from "@/lib/progress/load-assessor-progress";
import { MyAssessorTrainingCard } from "./my-assessor-training-card";

afterEach(cleanup);
const sample = (): AssessorStudyProgress => ({ programId: "manual", counts: { done: 2, total: 10, percent: 20 }, chapters: [
  { id: "c1", number: 1, title_en: "Basic", title_fil: "Batayan", href: "/training/manual/assessor/chapter-1", counts: { done: 2, total: 5, percent: 40 }, missing: 0 },
  { id: "c2", number: 2, title_en: "Common", title_fil: "Karaniwan", href: null, counts: { done: 0, total: 5, percent: 0 }, missing: 5 },
] });
it.each(["en", "fil"] as const)("shows personal counts, scoped chapter links, and separate certification (%s)", locale => {
  render(<MyAssessorTrainingCard progress={sample()} locale={locale} />);
  expect(screen.getAllByRole("progressbar")[0]).toHaveAttribute("aria-valuenow", "20");
  expect(screen.getByRole("link", { name: /Continue studying|Magpatuloy sa pag-aaral/ })).toHaveAttribute("href", "/training/manual/assessor/chapter-1");
  expect(screen.getByRole("link", { name: /certifications|sertipikasyon/ })).toHaveAttribute("href", "/training/manual/assessor/qualifications");
  expect(screen.queryByRole("link", { name: /Chapter 2|Kabanata 2/ })).not.toBeInTheDocument();
  expect(screen.getByText(locale === "en" ? "Not yet available" : "Hindi pa available")).toBeInTheDocument();
});
it("shows lessons complete without awarding certification or suggesting more lessons", () => {
  const p = sample(); p.chapters = [p.chapters[0]];
  p.counts = p.chapters[0].counts = { done: 5, total: 5, percent: 100 };
  render(<MyAssessorTrainingCard progress={p} locale="en" />);
  expect(screen.getByText("Lessons complete")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Continue studying/ })).not.toBeInTheDocument();
  expect(screen.queryByText("Certified")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Chapter 1: Basic" })).toBeInTheDocument();
});
it("continues to the next incomplete available chapter", () => {
  const p = sample(); p.chapters[0].counts = { done: 5, total: 5, percent: 100 };
  p.chapters[1].href = "/training/manual/assessor/chapter-2";
  render(<MyAssessorTrainingCard progress={p} locale="en" />);
  expect(screen.getByRole("link", { name: /Continue studying/ })).toHaveAttribute("href", "/training/manual/assessor/chapter-2");
});
