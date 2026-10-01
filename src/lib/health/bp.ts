import {
  BP_DIASTOLIC_LEVELS,
  BP_LIMITS,
  BP_LOW,
  BP_SYSTOLIC_LEVELS,
} from "./thresholds";

type Level = (typeof BP_SYSTOLIC_LEVELS)[number]["level"];

export type BpCategory = Level | "low";

export type BpInput = {
  systolic: number;
  diastolic: number;
  /** Chest pain, severe headache, weakness, confusion, breathlessness, etc. */
  symptoms?: boolean;
};

export type BpRejection =
  | "invalid_number"
  | "systolic_out_of_range"
  | "diastolic_out_of_range"
  | "systolic_not_above_diastolic";

export type BpResult =
  | {
      ok: true;
      category: BpCategory;
      /** Systolic >= 140 with diastolic < 90. */
      isolatedSystolic: boolean;
      /** Grade 3 reading, or any abnormal reading with symptoms. */
      urgent: boolean;
      /** True from grade 1 up: needs confirmation on repeat measurements. */
      hypertensiveRange: boolean;
    }
  | { ok: false; reason: BpRejection };

const ORDER: Level[] = [
  "optimal",
  "normal",
  "high_normal",
  "grade_1",
  "grade_2",
  "grade_3",
];

const finite = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

function levelOf(
  table: readonly { upTo: number; level: Level }[],
  value: number,
): Level {
  return table.find((row) => value < row.upTo)!.level;
}

export function classifyBp(input: BpInput): BpResult {
  const { systolic, diastolic, symptoms } = input;
  if (!finite(systolic) || !finite(diastolic)) {
    return { ok: false, reason: "invalid_number" };
  }
  if (systolic < BP_LIMITS.systolic.min || systolic > BP_LIMITS.systolic.max) {
    return { ok: false, reason: "systolic_out_of_range" };
  }
  if (
    diastolic < BP_LIMITS.diastolic.min ||
    diastolic > BP_LIMITS.diastolic.max
  ) {
    return { ok: false, reason: "diastolic_out_of_range" };
  }
  if (systolic <= diastolic) {
    return { ok: false, reason: "systolic_not_above_diastolic" };
  }

  const sysLevel = levelOf(BP_SYSTOLIC_LEVELS, systolic);
  const diaLevel = levelOf(BP_DIASTOLIC_LEVELS, diastolic);
  const level =
    ORDER.indexOf(sysLevel) >= ORDER.indexOf(diaLevel) ? sysLevel : diaLevel;

  const hypertensiveRange = ORDER.indexOf(level) >= ORDER.indexOf("grade_1");
  // A hypertensive systolic with a low diastolic is still hypertension.
  const low =
    !hypertensiveRange &&
    (systolic < BP_LOW.systolicBelow || diastolic < BP_LOW.diastolicBelow);
  const category: BpCategory = low ? "low" : level;

  return {
    ok: true,
    category,
    isolatedSystolic: systolic >= 140 && diastolic < 90,
    urgent: level === "grade_3" || (!!symptoms && (hypertensiveRange || low)),
    hypertensiveRange,
  };
}
