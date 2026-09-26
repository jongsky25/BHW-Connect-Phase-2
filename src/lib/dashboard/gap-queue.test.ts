import { describe, expect, it } from "vitest";
import { buildGapQueueSearchPattern } from "./gap-queue";

describe("buildGapQueueSearchPattern", () => {
  it("wraps plain text in wildcards", () => {
    expect(buildGapQueueSearchPattern("blood pressure")).toBe("%blood pressure%");
  });

  it("escapes percent and underscore so they are matched literally", () => {
    expect(buildGapQueueSearchPattern("50% off_er")).toBe("%50\\% off\\_er%");
  });

  it("escapes a literal backslash before wrapping", () => {
    expect(buildGapQueueSearchPattern("C:\\path")).toBe("%C:\\\\path%");
  });

  it("escapes backslashes introduced by earlier escaping only once, in input order", () => {
    expect(buildGapQueueSearchPattern("100%_done")).toBe("%100\\%\\_done%");
  });
});
