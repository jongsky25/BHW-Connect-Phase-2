import {
  BMI_ASIA_PACIFIC,
  BMI_LIMITS,
  BMI_MIN_AGE_YEARS,
  BMI_WHO,
} from "./thresholds";

export type WeightInput = { value: number; unit: "kg" | "lb" };
export type HeightInput =
  | { value: number; unit: "cm" | "m" | "in" }
  | { unit: "ft_in"; feet: number; inches: number };

export type BmiInput = {
  weight: WeightInput;
  height: HeightInput;
  ageYears: number;
  pregnant?: boolean;
};

export type AsiaPacificBmiCategory =
  (typeof BMI_ASIA_PACIFIC)[number]["category"];
export type WhoBmiCategory = (typeof BMI_WHO)[number]["category"];

export type BmiRejection =
  | "invalid_number"
  | "age_under_19"
  | "pregnant"
  | "weight_out_of_range"
  | "height_out_of_range";

export type BmiResult =
  | {
      ok: true;
      /** Rounded to one decimal; categories are assigned from this value. */
      bmi: number;
      asiaPacific: AsiaPacificBmiCategory;
      who: WhoBmiCategory;
    }
  | { ok: false; reason: BmiRejection };

const LB_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;

const finite = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

export function weightToKg(w: WeightInput): number {
  return w.unit === "lb" ? w.value * LB_TO_KG : w.value;
}

export function heightToCm(h: HeightInput): number {
  switch (h.unit) {
    case "cm":
      return h.value;
    case "m":
      return h.value * 100;
    case "in":
      return h.value * IN_TO_CM;
    case "ft_in":
      return (h.feet * 12 + h.inches) * IN_TO_CM;
  }
}

function classify<T extends readonly { upTo: number; category: string }[]>(
  table: T,
  bmi: number,
): T[number]["category"] {
  return table.find((row) => bmi < row.upTo)!.category;
}

export function computeBmi(input: BmiInput): BmiResult {
  const { weight, height, ageYears, pregnant } = input;
  const heightValues =
    height.unit === "ft_in" ? [height.feet, height.inches] : [height.value];
  if (![weight.value, ageYears, ...heightValues].every(finite)) {
    return { ok: false, reason: "invalid_number" };
  }
  if (ageYears < BMI_MIN_AGE_YEARS)
    return { ok: false, reason: "age_under_19" };
  if (pregnant) return { ok: false, reason: "pregnant" };

  const kg = weightToKg(weight);
  const cm = heightToCm(height);
  if (kg < BMI_LIMITS.weightKg.min || kg > BMI_LIMITS.weightKg.max) {
    return { ok: false, reason: "weight_out_of_range" };
  }
  if (cm < BMI_LIMITS.heightCm.min || cm > BMI_LIMITS.heightCm.max) {
    return { ok: false, reason: "height_out_of_range" };
  }

  const m = cm / 100;
  const bmi = Math.round((kg / (m * m)) * 10) / 10;
  return {
    ok: true,
    bmi,
    asiaPacific: classify(BMI_ASIA_PACIFIC, bmi),
    who: classify(BMI_WHO, bmi),
  };
}
