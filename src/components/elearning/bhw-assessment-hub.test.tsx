import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { BhwAssessmentHub } from "./bhw-assessment-hub";

afterEach(cleanup);

const chapter1 = { chapter_key: "chapter-1", position: 0, title_fil: "Ang mga BHW at ang Kanilang Barangay", title_en: "BHWs and Their Barangay" };
const chapter2 = { chapter_key: "chapter-2", position: 1, title_fil: "Unang Tagatugon", title_en: "BHWs as First Responders" };
const subs = [
  { id: "m1", position: 0, title_fil: "Ang mga Tungkulin ng Isang BHW", title_en: "The Roles of a BHW" },
  { id: "m6", position: 5, title_fil: "Epektibong Komunikasyon", title_en: "Effective Communication" },
];
const base = { lang: "en" as const, programId: "prog", areaName: "Fictional City", assignmentValid: true, chapterError: false };

it("lists every available chapter and opens a subchapter on the BHWs section", () => {
  render(<BhwAssessmentHub {...base} chapters={[chapter1, chapter2]} selected={chapter1} subchapters={subs} />);
  expect(screen.getByRole("link", { name: /Chapter 1\s*BHWs and Their Barangay/ })).toHaveAttribute("href", "/assessments?chapter=chapter-1");
  expect(screen.getByRole("link", { name: /Chapter 2/ })).toHaveAttribute("href", "/assessments?chapter=chapter-2");
  expect(screen.getByRole("link", { name: /Chapter 1\s*BHWs/ })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: /1\.1 The Roles of a BHW/ })).toHaveAttribute("href", "/training/prog/chapter-1/m1?view=bhws");
  expect(screen.getByRole("link", { name: /1\.6 Effective Communication/ })).toHaveAttribute("href", "/training/prog/chapter-1/m6?view=bhws");
  expect(screen.getByText("Fictional City")).toBeInTheDocument();
});

it("asks for a chapter before showing subchapters", () => {
  render(<BhwAssessmentHub {...base} chapters={[chapter1, chapter2]} selected={null} subchapters={[]} />);
  expect(screen.queryByText(/Select a subchapter/)).not.toBeInTheDocument();
});

it("shows the administrator message and no assessment links without a valid assignment", () => {
  render(<BhwAssessmentHub {...base} assignmentValid={false} chapters={[chapter1]} selected={chapter1} subchapters={subs} />);
  expect(screen.getByRole("alert")).toHaveTextContent("No barangay assignment found. Please contact your system administrator.");
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

it("renders Filipino labels", () => {
  render(<BhwAssessmentHub {...base} lang="fil" chapters={[chapter1]} selected={chapter1} subchapters={subs} />);
  expect(screen.getByRole("link", { name: /1\.1 Ang mga Tungkulin ng Isang BHW/ })).toBeInTheDocument();
  expect(screen.getByText("2. Pumili ng subchapter")).toBeInTheDocument();
});
