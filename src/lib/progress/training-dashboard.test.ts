import { describe, expect, it } from "vitest";
import { completionRate, progressStatus } from "./training-dashboard";

describe("training dashboard display measures", () => {
  it("does not display 100% until every learner or lesson is complete", () => {
    expect(completionRate(199, 200)).toBe(99);
    expect(completionRate(200, 200)).toBe(100);
    expect(completionRate(0, 0)).toBeNull();
  });

  it("keeps content completion separate from the final outcome", () => {
    expect(progressStatus({ started: true, content_completed: true, final_completed: false }))
      .toBe("content_completed");
    expect(progressStatus({ started: true, content_completed: true, final_completed: true }))
      .toBe("final_completed");
  });
});
