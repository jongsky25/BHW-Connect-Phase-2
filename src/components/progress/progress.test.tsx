import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { summariseManualProgress, type ProgressState } from "@/lib/progress/manual-progress";
import { BhwProgressCard } from "./bhw-progress-card";
import { ChapterSteps } from "./chapter-steps";
import { MyTrainingCard } from "./my-training-card";
import { ProgressBar } from "./progress-bar";
import { STATE_STYLES } from "./progress-styles";
import { StatusChip } from "./status-chip";

const t = (s: string) => ({ title_fil: `${s} fil`, title_en: `${s} en` });

const progress = summariseManualProgress({
  program: { id: "p1", content_key: "bhw-reference-manual", ...t("Manual") },
  chapters: [
    { id: "ch1", chapter_key: "chapter-1", position: 0, course_id: "c1", availability: "available", ...t("One") },
    { id: "ch2", chapter_key: "chapter-2", position: 1, course_id: null, availability: "unavailable", ...t("Two") },
  ],
  publishedCourseIds: ["c1"],
  modules: [
    { id: "m1", course_id: "c1", position: 0, type: "lesson", ...t("Sub 1") },
    { id: "m2", course_id: "c1", position: 1, type: "lesson", ...t("Sub 2") },
  ],
  lessons: [
    { id: "l1", module_id: "m1", position: 0, required: true, ...t("L1") },
    { id: "l2", module_id: "m1", position: 1, required: true, ...t("L2") },
    { id: "l3", module_id: "m2", position: 0, required: true, ...t("L3") },
  ],
  courseProgress: [],
  completedLessonIds: ["l1"],
  resumes: [{ lesson_id: "l2", updated_at: "2026-09-24T01:00:00Z" }],
  attempts: [{ course_id: "c1", phase: "pretest" }],
  certificates: [],
  questionBankCourseIds: ["c1"],
});

describe("progress colour codes", () => {
  it("gives every state an icon and a label in both languages, and never uses danger", () => {
    for (const [state, style] of Object.entries(STATE_STYLES)) {
      expect(style.icon, state).not.toBe("");
      expect(style.label.fil, state).not.toBe("");
      expect(style.label.en, state).not.toBe("");
      expect(`${style.bar} ${style.ring} ${style.chip}`, state).not.toMatch(/danger/);
    }
  });

  it("uses a distinct chip colour for each actionable state", () => {
    const actionable: ProgressState[] = ["in_progress", "ready_for_assessment", "retake_assessment", "completed", "certified"];
    expect(new Set(actionable.map((s) => STATE_STYLES[s].chip)).size).toBe(actionable.length);
  });

  it("renders a chip with a text label, not colour alone", () => {
    render(<StatusChip state="retake_assessment" locale="fil" />);
    expect(screen.getByText("Ulitin ang pagtatasa")).toBeInTheDocument();
  });
});

describe("ProgressBar", () => {
  it("exposes the value to assistive technology and prints the number", () => {
    render(<ProgressBar counts={{ done: 4, total: 6, percent: 67 }} state="in_progress" label="Kabanata 1" locale="en" />);
    const bar = screen.getByRole("progressbar", { name: "Kabanata 1" });
    expect(bar).toHaveAttribute("aria-valuenow", "67");
    expect(bar).toHaveAttribute("aria-valuetext", "4/6 lessons · 67%");
    expect(screen.getByText("4/6 lessons · 67%")).toBeInTheDocument();
  });

  it("splits into one segment per subchapter that has lessons", () => {
    const ch = progress.chapters[0];
    const { container } = render(
      <ProgressBar
        counts={ch.counts}
        state={ch.state}
        label="ch"
        locale="en"
        segments={ch.subchapters.map((s) => ({ counts: s.counts, state: s.state, label: s.number }))}
      />,
    );
    expect(container.querySelectorAll("[title]")).toHaveLength(2);
  });
});

describe("ChapterSteps", () => {
  it("marks exactly one step as current", () => {
    render(<ChapterSteps steps={progress.chapters[0].steps} locale="en" />);
    const list = screen.getByRole("list", { name: "Chapter steps" });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((i) => i.getAttribute("data-state"))).toEqual(["done", "current", "todo", "todo"]);
    expect(items.filter((i) => i.getAttribute("aria-current") === "step")).toHaveLength(1);
  });
});

describe("MyTrainingCard", () => {
  it("shows the overall total, each chapter's state and a continue link", () => {
    render(<MyTrainingCard progress={progress} locale="en" />);
    expect(screen.getByRole("heading", { name: "My training" })).toBeInTheDocument();
    expect(screen.getByText("1 of 3 lessons done")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Overall progress in BHW Reference Manual" })).toHaveAttribute(
      "aria-valuenow",
      "33",
    );
    expect(screen.getByRole("link", { name: "Chapter 1: One en" })).toHaveAttribute("href", "/training/p1/chapter-1");
    expect(screen.getByText("Chapter 2: Two en")).toBeInTheDocument();
    expect(screen.getByText("Not yet available")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continue where you left off/ })).toHaveAttribute(
      "href",
      "/training/p1/chapter-1/m1/l2",
    );
  });

  it("speaks Filipino by default", () => {
    render(<MyTrainingCard progress={progress} locale="fil" />);
    expect(screen.getByRole("heading", { name: "Ang aking pagsasanay" })).toBeInTheDocument();
    expect(screen.getByText("1 sa 3 na aralin ang tapos")).toBeInTheDocument();
  });
});

describe("BhwProgressCard", () => {
  const row = { bhw: { id: "u1", username: "maria", full_name: "Maria Santos", org_unit_name: "Brgy 1" }, progress };

  it("names the BHW, their area and overall state, with chapter and subchapter bars behind the summary", () => {
    render(
      <ul>
        <BhwProgressCard row={row} locale="en" detailsLabel="Chapters and subchapters" />
      </ul>,
    );
    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    expect(screen.getByText("maria · Brgy 1")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Maria Santos: 1 of 3 lessons done", hidden: true })).toHaveAttribute(
      "aria-valuenow",
      "33",
    );
    expect(
      screen.getByRole("progressbar", { name: "Maria Santos, Chapter 1: 1 of 3 lessons done", hidden: true }),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Maria Santos, 1.1: 1 of 2 lessons done", hidden: true })).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
    expect(screen.getByText("Chapter 2: Two en")).toBeInTheDocument();
    // Supervisors see state, not learner links.
    expect(screen.queryByRole("link", { hidden: true })).toBeNull();
  });
});
