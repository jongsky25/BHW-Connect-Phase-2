import type { BmiInput } from "./bmi";

// Pulls BMI and blood-pressure inputs out of a free-text question in English,
// Filipino or Taglish ("BMI ko 62 kg 160 cm 35 taong gulang", "BP 150/95").
// Pure and deterministic: it extracts what is written and reports what is
// missing; it never guesses a value. Raw text is parsed, not the normalized
// form, because normalization strips the "/" and "'" these formats rely on.

export type BpParse = {
  kind: "bp";
  systolic: number;
  diastolic: number;
  /** Emergency signs that matter with a raised reading. */
  symptoms: boolean;
  /** Signs that matter with a low reading (dizziness, cold sweat), plus the above. */
  lowSymptoms: boolean;
  /** Both numbers fell outside what a real reading could be. */
  implausible: boolean;
};

export type BmiParse = {
  kind: "bmi";
  weight?: BmiInput["weight"];
  height?: BmiInput["height"];
  ageYears?: number;
  pregnant: boolean;
};

export type MeasurementParse = BpParse | BmiParse;

const NUM = String.raw`(\d{1,3}(?:[.,]\d{1,2})?)`;
const toNumber = (s: string) => Number(s.replace(",", "."));

const BP_WORDS =
  /\b(?:bp|b\.p\.|presyon|prisyon|presion|pressure|altapresyon|mmhg)\b/i;
const BMI_WORDS = /\b(?:bmi|body mass index)\b/i;
// "Why does another guideline call 130/80 high?" carries a reading-shaped
// number but is a knowledge question; these words send it to the KB instead.
const KNOWLEDGE_MARKERS =
  /\b(?:guidelines?|gabay|why|bakit|ibang|another|other)\b/i;
const PREGNANT = /\b(?:buntis|pregnant|nagbubuntis|pregnancy)\b/i;

// Whole-phrase symptom list, reviewed clinically — extend by adding a phrase,
// not by loosening a pattern. Mirrors the intent of the rf-bp-symptomatic
// red-flag rule, but for a reading that carries numbers.
const SYMPTOM_PHRASES = [
  "dibdib",
  "chest pain",
  "chest pains",
  "hirap huminga",
  "nahihirapan huminga",
  "hinihingal",
  "shortness of breath",
  "matinding sakit ng ulo",
  "matinding sakit sa ulo",
  "severe headache",
  "panghihina",
  "nanghihina",
  "pagkalito",
  "nalilito",
  "confusion",
  "confused",
  "himatay",
  "nahimatay",
  "hinimatay",
  "malabo ang paningin",
  "blurred vision",
];

// With a LOW reading the warning signs differ (dizziness on standing is the
// classic one), but mild dizziness alongside a high reading is not by itself
// an emergency, so it only counts here.
const LOW_SYMPTOM_PHRASES = [
  "nahihilo",
  "hilo",
  "dizzy",
  "dizziness",
  "malamig na pawis",
  "cold sweat",
];

function normalizedPadded(raw: string): string {
  return ` ${raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")} `;
}

function hasAny(raw: string, phrases: string[]): boolean {
  const text = normalizedPadded(raw);
  return phrases.some((p) => text.includes(` ${p} `));
}

function parseBp(raw: string): BpParse | null {
  const hasWord = BP_WORDS.test(raw);
  // "120/80", "120 / 80", "120 over 80"; with a BP word also "120 sa 80", "120-80".
  const sep = hasWord
    ? String.raw`(?:\/|\\|over|sa|-)`
    : String.raw`(?:\/|over)`;
  const m = new RegExp(
    String.raw`(?<![\d.])(\d{2,3})\s*${sep}\s*(\d{2,3})(?![\d.])`,
    "i",
  ).exec(raw);
  if (!m) return null;
  const systolic = Number(m[1]);
  const diastolic = Number(m[2]);
  const plausible =
    systolic >= 50 &&
    systolic <= 300 &&
    diastolic >= 30 &&
    diastolic <= 200 &&
    systolic > diastolic;
  // Without a BP word a bare "12/10" (a date, a score) is not a reading.
  if (!hasWord && !plausible) return null;
  const symptoms = hasAny(raw, SYMPTOM_PHRASES);
  return {
    kind: "bp",
    systolic,
    diastolic,
    symptoms,
    lowSymptoms: symptoms || hasAny(raw, LOW_SYMPTOM_PHRASES),
    implausible: !plausible,
  };
}

function parseWeight(raw: string): BmiInput["weight"] | undefined {
  let m = new RegExp(`${NUM}\\s*(?:kgs?|kilos?|kilograms?)\\b`, "i").exec(raw);
  if (m) return { value: toNumber(m[1]), unit: "kg" };
  m = new RegExp(`${NUM}\\s*(?:lbs?|pounds?|libra)\\b`, "i").exec(raw);
  if (m) return { value: toNumber(m[1]), unit: "lb" };
  // "timbang 62", "weight: 62" — unit assumed kg, the Philippine norm.
  m = new RegExp(
    `(?:timbang|weight|bigat)\\s*(?:ko|niya|nya|ay|is|na)?\\s*[:=]?\\s*${NUM}(?!\\s*(?:cm|m\\b))`,
    "i",
  ).exec(raw);
  if (m) return { value: toNumber(m[1]), unit: "kg" };
  return undefined;
}

function parseHeight(raw: string): BmiInput["height"] | undefined {
  // 5'3, 5'3", 5 ft 3 in, 5 feet 3 inches, 5 talampakan 3 pulgada
  let m =
    /(\d)\s*(?:'|ft\b|feet\b|foot\b|talampakan\b)\s*(\d{1,2})?\s*(?:"|in\b|inch(?:es)?\b|pulgada\b)?/i.exec(
      raw,
    );
  if (m && (m[2] !== undefined || /ft|feet|foot|talampakan/i.test(m[0]))) {
    return {
      unit: "ft_in",
      feet: Number(m[1]),
      inches: m[2] ? Number(m[2]) : 0,
    };
  }
  m = new RegExp(
    `${NUM}\\s*(?:cm|sentimetro|centimeters?|centimetres?)\\b`,
    "i",
  ).exec(raw);
  if (m) return { value: toNumber(m[1]), unit: "cm" };
  m = new RegExp(`${NUM}\\s*(?:m|meters?|metres?|metro)\\b`, "i").exec(raw);
  if (m) return { value: toNumber(m[1]), unit: "m" };
  m = new RegExp(
    `(?:taas|height)\\s*(?:ko|niya|nya|ay|is|na)?\\s*[:=]?\\s*${NUM}`,
    "i",
  ).exec(raw);
  if (m) {
    const v = toNumber(m[1]);
    // "taas 1.6" is metres, "taas 160" is centimetres.
    return v < 3 ? { value: v, unit: "m" } : { value: v, unit: "cm" };
  }
  return undefined;
}

function parseAge(raw: string): number | undefined {
  const m =
    /(\d{1,3})\s*(?:taong gulang|taon gulang|taon|years? old|yrs? old|yo|y\/o|anyos|years?)\b/i.exec(
      raw,
    ) ??
    /(?:edad|age)\s*(?:ko|niya|nya|ay|is|na)?\s*[:=]?\s*(\d{1,3})\b/i.exec(raw);
  return m ? Number(m[1]) : undefined;
}

function parseBmi(raw: string): BmiParse | null {
  const weight = parseWeight(raw);
  const height = parseHeight(raw);
  const named = BMI_WORDS.test(raw);
  // A question that merely mentions BMI ("what is BMI?") has no inputs and
  // belongs to the knowledge base. Compute only when a number was given, and
  // either the question names BMI or supplies both weight and height.
  if (!weight && !height) return null;
  if (!named && !(weight && height)) return null;
  return {
    kind: "bmi",
    weight,
    height,
    ageYears: parseAge(raw),
    pregnant: PREGNANT.test(raw),
  };
}

export function parseMeasurement(raw: string): MeasurementParse | null {
  const text = raw.trim();
  if (text.length === 0) return null;
  // A question naming BMI is a BMI request even if a stray "x/y" appears.
  if (BMI_WORDS.test(text)) return parseBmi(text) ?? null;
  if (KNOWLEDGE_MARKERS.test(text)) return null;
  return parseBp(text) ?? parseBmi(text);
}
