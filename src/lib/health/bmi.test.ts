import { describe, expect, it } from "vitest";
import { computeBmi } from "./bmi";

const adult = (kg: number, cm: number) =>
  computeBmi({
    weight: { value: kg, unit: "kg" },
    height: { value: cm, unit: "cm" },
    ageYears: 30,
  });

describe("computeBmi", () => {
  it("classifies against both schemes", () => {
    // 62 kg, 160 cm -> 24.2: WHO normal, Asia-Pacific overweight.
    expect(adult(62, 160)).toEqual({
      ok: true,
      bmi: 24.2,
      asiaPacific: "overweight",
      who: "normal",
    });
  });

  it.each([
    [18.4, "underweight", "underweight"],
    [18.5, "normal", "normal"],
    [22.9, "normal", "normal"],
    [23.0, "overweight", "normal"],
    [24.9, "overweight", "normal"],
    [25.0, "obese_1", "overweight"],
    [29.9, "obese_1", "overweight"],
    [30.0, "obese_2", "obese_1"],
    [34.9, "obese_2", "obese_1"],
    [35.0, "obese_2", "obese_2"],
    [39.9, "obese_2", "obese_2"],
    [40.0, "obese_2", "obese_3"],
  ])("boundary BMI %s", (target, ap, who) => {
    // 200 cm tall: BMI = kg / 4, so weight = 4 x target.
    expect(adult(target * 4, 200)).toMatchObject({
      ok: true,
      bmi: target,
      asiaPacific: ap,
      who,
    });
  });

  it("classifies from the one-decimal rounded value", () => {
    // 24.96 rounds to 25.0 -> WHO overweight, Asia-Pacific obese I.
    const r = adult(99.84, 200);
    expect(r).toMatchObject({ ok: true, bmi: 25, who: "overweight" });
  });

  it("converts pounds and feet/inches", () => {
    const r = computeBmi({
      weight: { value: 136.7, unit: "lb" },
      height: { unit: "ft_in", feet: 5, inches: 3 },
      ageYears: 40,
    });
    expect(r).toMatchObject({ ok: true, bmi: 24.2 });
  });

  it("converts metres", () => {
    expect(
      computeBmi({
        weight: { value: 62, unit: "kg" },
        height: { value: 1.6, unit: "m" },
        ageYears: 30,
      }),
    ).toMatchObject({ ok: true, bmi: 24.2 });
  });

  it("rejects out-of-scope and implausible input", () => {
    expect(
      computeBmi({
        weight: { value: 50, unit: "kg" },
        height: { value: 160, unit: "cm" },
        ageYears: 15,
      }),
    ).toEqual({ ok: false, reason: "age_under_19" });
    expect(
      computeBmi({
        weight: { value: 60, unit: "kg" },
        height: { value: 160, unit: "cm" },
        ageYears: 28,
        pregnant: true,
      }),
    ).toEqual({ ok: false, reason: "pregnant" });
    expect(adult(10, 160)).toEqual({
      ok: false,
      reason: "weight_out_of_range",
    });
    expect(adult(60, 16)).toEqual({ ok: false, reason: "height_out_of_range" });
    expect(adult(NaN, 160)).toEqual({ ok: false, reason: "invalid_number" });
  });
});
