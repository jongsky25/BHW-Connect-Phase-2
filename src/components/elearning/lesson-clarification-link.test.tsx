import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LessonClarificationLink } from "./lesson-clarification-link";

const route = vi.hoisted(() => ({ pathname: "" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
afterEach(cleanup);

it.each([
  ["f1f527f1-aec9-48a8-933b-79fecf63bfb4", "bhw-role"],
  ["84abb8a8-9d6b-4e09-8936-998738d3ff37", "benefits"],
  ["e3abb325-3ccc-47e4-95de-94be7d9735ac", "network-referral"],
  ["9d468901-a2be-4805-afbd-be798136918b", "problem-analysis"],
  ["9b959b18-f9e4-4b2f-a7ef-569d5992963d", "problem-analysis"],
])("links BHW and assessor lesson %s to its specific clarification", (lesson, topic) => {
  for (const rolePath of ["", "assessor/"]) {
    route.pathname = `/training/p/${rolePath}chapter-1/module/${lesson}`;
    render(<LessonClarificationLink locale="en" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", `/content-clarifications#${topic}`);
    cleanup();
  }
});

it("does not add a study hint to exams, unrelated lessons or non-training routes", () => {
  for (const pathname of ["/training/p/chapter-1/exam/pretest", "/training/p/chapter-1/m/other", "/admin/f1f527f1-aec9-48a8-933b-79fecf63bfb4", "/courses"]) {
    route.pathname = pathname;
    render(<LessonClarificationLink locale="fil" />);
    expect(screen.queryByRole("link")).toBeNull();
    cleanup();
  }
});
