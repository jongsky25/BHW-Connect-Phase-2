// Cut-offs for BMI and office blood-pressure classification. Single place to
// review and change; every table carries the source it comes from. The
// matching entries in content/kb/hhp-ncd/sources.json are registered with the
// KB content PR, and clinical sign-off (BLHSD–WHO) gates publishing them.

/** WHO Expert Consultation, "Appropriate body-mass index for Asian
 *  populations" (Lancet 2004) and WHO-WPRO/IASO/IOTF Asia-Pacific
 *  perspective (2000). Upper bound is exclusive. */
export const BMI_ASIA_PACIFIC = [
  { upTo: 18.5, category: "underweight" },
  { upTo: 23, category: "normal" },
  { upTo: 25, category: "overweight" },
  { upTo: 30, category: "obese_1" },
  { upTo: Infinity, category: "obese_2" },
] as const;

/** WHO Technical Report Series 894 (2000), international classification.
 *  Upper bound is exclusive. */
export const BMI_WHO = [
  { upTo: 18.5, category: "underweight" },
  { upTo: 25, category: "normal" },
  { upTo: 30, category: "overweight" },
  { upTo: 35, category: "obese_1" },
  { upTo: 40, category: "obese_2" },
  { upTo: Infinity, category: "obese_3" },
] as const;

export const BMI_MIN_AGE_YEARS = 19;
export const BMI_LIMITS = {
  weightKg: { min: 20, max: 400 },
  heightCm: { min: 100, max: 250 },
} as const;

/** Office BP grades from the 2018 ESC/ESH guideline. These are NOT the
 *  Philippine classification: the Philippine Society of Hypertension 2020 CPG
 *  uses three bands (normal <120/80, borderline 120-139/80-89, hypertension
 *  >=140/90, confirmed on at least two readings on two separate days) and no
 *  grades, though the 140/90 boundary is shared. The Philippine acute severe
 *  hypertension threshold (2024 CPG) is also diastolic >=120, not the >=110
 *  of grade 3 below. See docs/bp-thresholds-evidence.md. A reading takes the
 *  higher of its systolic and diastolic grades. Bounds are exclusive upper
 *  limits. */
export const BP_SYSTOLIC_LEVELS = [
  { upTo: 120, level: "optimal" },
  { upTo: 130, level: "normal" },
  { upTo: 140, level: "high_normal" },
  { upTo: 160, level: "grade_1" },
  { upTo: 180, level: "grade_2" },
  { upTo: Infinity, level: "grade_3" },
] as const;

export const BP_DIASTOLIC_LEVELS = [
  { upTo: 80, level: "optimal" },
  { upTo: 85, level: "normal" },
  { upTo: 90, level: "high_normal" },
  { upTo: 100, level: "grade_1" },
  { upTo: 110, level: "grade_2" },
  { upTo: Infinity, level: "grade_3" },
] as const;

/** No universal guideline cut-off; clinical convention. PENDING sign-off. */
export const BP_LOW = { systolicBelow: 90, diastolicBelow: 60 } as const;

export const BP_LIMITS = {
  systolic: { min: 50, max: 300 },
  diastolic: { min: 30, max: 200 },
} as const;
