import { describe, expect, it } from "vitest";
import { appendCoursePathSegment, withCourseLayout, withoutCourseLayout } from "./course-layout";

describe("course layout links", () => {
  it("keeps the assessment and facilitator view parameters when switching layout", () => {
    expect(withCourseLayout("/courses/123?assessment=1", true)).toBe(
      "/courses/123?assessment=1&layout=full",
    );
    expect(withoutCourseLayout("/training/123/lesson?view=lesson&mode=slides&layout=full")).toBe(
      "/training/123/lesson?view=lesson&mode=slides",
    );
  });

  it("does not add layout parameters in standard view", () => {
    expect(withCourseLayout("/courses", false)).toBe("/courses");
    expect(withoutCourseLayout("/courses?layout=full")).toBe("/courses");
  });

  it("opens another lesson before the layout query", () => {
    expect(appendCoursePathSegment("/training/program/chapter/module?layout=full", "lesson"))
      .toBe("/training/program/chapter/module/lesson?layout=full");
  });
});
