import { describe, expect, it } from "vitest";
import { planTestBankSync } from "./test-bank.mjs";

const opts = [{ fil: "A", en: "A" }, { fil: "B", en: "B" }];
const question = (prompt, extra = {}) => ({
  prompt_fil: prompt, prompt_en: prompt, options: opts, correct_option_index: 0, module_position: 0, ...extra,
});
const row = (id, position, prompt, extra = {}) => ({ id, position, retired_at: null, ...question(prompt), ...extra });

describe("planTestBankSync", () => {
  it("inserts every question into an empty bank", () => {
    const plan = planTestBankSync([], [question("Q1"), question("Q2", { module_position: 3 })]);
    expect(plan.insert.map((p) => [p.position, p.prompt_en, p.module_position])).toEqual([[0, "Q1", 0], [1, "Q2", 3]]);
    expect(plan).toMatchObject({ retire: [], tag: [], keep: 0 });
  });

  it("keeps an identical bank without writes", () => {
    const plan = planTestBankSync([row("a", 0, "Q1"), row("b", 1, "Q2")], [question("Q1"), question("Q2")]);
    expect(plan).toEqual({ insert: [], retire: [], tag: [], keep: 2 });
  });

  it("retires a changed question and inserts its replacement at the same position", () => {
    const plan = planTestBankSync([row("a", 0, "Q1"), row("b", 1, "Old")], [question("Q1"), question("New")]);
    expect(plan.retire).toEqual([{ id: "b", position: 1 }]);
    expect(plan.insert.map((p) => [p.position, p.prompt_en])).toEqual([[1, "New"]]);
    expect(plan.keep).toBe(1);
  });

  it("treats a changed answer key or option as a content change", () => {
    const plan = planTestBankSync(
      [row("a", 0, "Q"), row("b", 1, "Q")],
      [question("Q", { correct_option_index: 1 }), question("Q", { options: [{ fil: "A", en: "A" }, { fil: "B", en: "B2" }] })],
    );
    expect(plan.retire.map((r) => r.id)).toEqual(["a", "b"]);
    expect(plan.insert).toHaveLength(2);
  });

  it("tags an untagged question in place instead of versioning it", () => {
    const plan = planTestBankSync([row("a", 0, "Q1", { module_position: null })], [question("Q1", { module_position: 4 })]);
    expect(plan).toEqual({ insert: [], retire: [], tag: [{ id: "a", position: 0, module_position: 4 }], keep: 0 });
  });

  it("ignores retired rows and appends new positions", () => {
    const plan = planTestBankSync(
      [row("old", 0, "Older", { retired_at: "2026-09-01" }), row("a", 0, "Q1")],
      [question("Q1"), question("Q2")],
    );
    expect(plan.keep).toBe(1);
    expect(plan.retire).toEqual([]);
    expect(plan.insert.map((p) => p.position)).toEqual([1]);
  });

  it("retires active questions beyond the end of the file", () => {
    const plan = planTestBankSync([row("a", 0, "Q1"), row("b", 1, "Q2")], [question("Q1")]);
    expect(plan.retire).toEqual([{ id: "b", position: 1 }]);
  });

  it("refuses a bank with two active rows at one position", () => {
    expect(() => planTestBankSync([row("a", 0, "Q1"), row("b", 0, "Q1")], [question("Q1")])).toThrow(/two active/);
  });
});
