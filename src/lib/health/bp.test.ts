import { describe, expect, it } from "vitest";
import { classifyBp } from "./bp";

const cat = (systolic: number, diastolic: number, symptoms = false) =>
  classifyBp({ systolic, diastolic, symptoms });

describe("classifyBp", () => {
  it.each([
    [119, 79, "optimal"],
    [120, 79, "normal"],
    [119, 80, "normal"],
    [129, 84, "normal"],
    [130, 84, "high_normal"],
    [129, 85, "high_normal"],
    [139, 89, "high_normal"],
    [140, 89, "grade_1"],
    [139, 90, "grade_1"],
    [159, 99, "grade_1"],
    [160, 99, "grade_2"],
    [159, 100, "grade_2"],
    [179, 109, "grade_2"],
    [180, 109, "grade_3"],
    [179, 110, "grade_3"],
    [200, 120, "grade_3"],
  ])("%i/%i -> %s", (s, d, expected) => {
    expect(cat(s, d)).toMatchObject({ ok: true, category: expected });
  });

  it("takes the higher of the two grades", () => {
    expect(cat(118, 95)).toMatchObject({ category: "grade_1" });
    expect(cat(165, 82)).toMatchObject({ category: "grade_2" });
  });

  it("flags isolated systolic hypertension", () => {
    expect(cat(150, 85)).toMatchObject({
      category: "grade_1",
      isolatedSystolic: true,
      hypertensiveRange: true,
    });
    expect(cat(150, 95)).toMatchObject({ isolatedSystolic: false });
  });

  it("labels low readings, but hypertension wins over a low diastolic", () => {
    expect(cat(89, 70)).toMatchObject({ category: "low" });
    expect(cat(100, 59)).toMatchObject({ category: "low" });
    expect(cat(90, 60)).toMatchObject({ category: "optimal" });
    expect(cat(150, 55)).toMatchObject({
      category: "grade_1",
      isolatedSystolic: true,
    });
  });

  it("marks urgent for grade 3, or abnormal readings with symptoms", () => {
    expect(cat(180, 100)).toMatchObject({ urgent: true });
    expect(cat(150, 95)).toMatchObject({ urgent: false });
    expect(cat(150, 95, true)).toMatchObject({ urgent: true });
    expect(cat(85, 55, true)).toMatchObject({ urgent: true });
    expect(cat(115, 75, true)).toMatchObject({ urgent: false });
  });

  it("rejects implausible input", () => {
    expect(cat(NaN, 80)).toEqual({ ok: false, reason: "invalid_number" });
    expect(cat(400, 80)).toEqual({
      ok: false,
      reason: "systolic_out_of_range",
    });
    expect(cat(120, 10)).toEqual({
      ok: false,
      reason: "diastolic_out_of_range",
    });
    expect(cat(80, 90)).toEqual({
      ok: false,
      reason: "systolic_not_above_diastolic",
    });
  });
});
