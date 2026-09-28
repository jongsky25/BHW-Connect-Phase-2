import { describe, expect, it } from "vitest";
import { completionMilestoneOnSave } from "./completion-milestone";

const modules = [
  { id: "a", type: "lesson" },
  { id: "b", type: "lesson" },
  { id: "quiz", type: "quiz" },
];
const lessons = [
  { id: "a1", module_id: "a", required: true },
  { id: "a2", module_id: "a", required: true },
  { id: "optional", module_id: "a", required: false },
  { id: "b1", module_id: "b", required: true },
  { id: "quiz1", module_id: "quiz", required: true },
];

describe("completionMilestoneOnSave", () => {
  it("waits for every published required lesson in the subchapter", () => {
    expect(completionMilestoneOnSave(lessons[0], lessons, modules, new Set())).toBeNull();
  });

  it("recognizes the final required subchapter lesson while the chapter still has work", () => {
    expect(completionMilestoneOnSave(lessons[1], lessons, modules, new Set(["a1"]))).toBe("subchapter");
  });

  it("recognizes the final required chapter lesson without counting quiz modules", () => {
    expect(completionMilestoneOnSave(lessons[3], lessons, modules, new Set(["a1", "a2"]))).toBe("chapter");
  });

  it("does not re-celebrate historical completions, optional lessons, or quiz lessons", () => {
    expect(completionMilestoneOnSave(lessons[3], lessons, modules, new Set(["a1", "a2", "b1"]))).toBeNull();
    expect(completionMilestoneOnSave(lessons[2], lessons, modules, new Set(["a1", "a2", "b1"]))).toBeNull();
    expect(completionMilestoneOnSave(lessons[4], lessons, modules, new Set(["a1", "a2", "b1"]))).toBeNull();
  });
});
