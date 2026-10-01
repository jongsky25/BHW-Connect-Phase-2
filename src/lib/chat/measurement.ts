import { computeBmi, type AsiaPacificBmiCategory } from "../health/bmi";
import { classifyBp, type BpCategory } from "../health/bp";
import {
  EMERGENCY_FALLBACK,
  formatBmi,
  formatBmiMissing,
  formatBmiRejection,
  formatBp,
  formatBpRejection,
  type Bilingual,
} from "../health/format";
import { parseMeasurement } from "../health/parse";
import type { ChatEntryCandidate } from "./types";

// Turns a typed BMI or blood-pressure question into a computed answer, ahead
// of KB scoring. Deterministic: numbers are parsed, classified by
// src/lib/health, and worded from fixed bilingual strings. Nothing here is
// stored — the route redacts the turn before logging (see route.ts).

export type MeasurementKind = "bmi" | "bp";

export type MeasurementOutcome =
  | "result"
  | "needs_input"
  | "out_of_scope"
  | "invalid";

/** How loudly the UI should present it. */
export type MeasurementUrgency = "none" | "attention" | "emergency";

export type MeasurementAnswer = {
  kind: MeasurementKind;
  outcome: MeasurementOutcome;
  urgency: MeasurementUrgency;
  text: Bilingual;
  /** KB entries offered as follow-ups, restricted to published ones. */
  related: ChatEntryCandidate[];
  /**
   * The clinician-approved "what should I tell them / what do I do next"
   * entry for this result, when it is published. Absent for a missing-input,
   * invalid or out-of-scope reply, for an emergency (the emergency steps are
   * already the reply), and when the entry is not published.
   */
  advice?: ChatEntryCandidate;
};

const RELATED: Record<MeasurementKind, string[]> = {
  bmi: ["m2-bmi-categories", "m2-bmi-which-scheme", "m2-bmi-limits"],
  bp: ["m3-bp-categories", "m3-bp-one-reading", "m3-bp-different-categories"],
};

const EMERGENCY_ENTRY = "m3-very-high-with-symptoms";

// One advice entry per result the calculator can return (module-5.json, the
// adv-* entries). BMI follows the Asia-Pacific category, the one shown first.
const BMI_ADVICE: Record<AsiaPacificBmiCategory, string> = {
  underweight: "adv-bmi-underweight",
  normal: "adv-bmi-normal",
  overweight: "adv-bmi-overweight",
  obese_1: "adv-bmi-obese",
  obese_2: "adv-bmi-obese",
};

const BP_ADVICE: Record<BpCategory, string> = {
  optimal: "adv-bp-normal",
  normal: "adv-bp-normal",
  high_normal: "adv-bp-high-normal",
  grade_1: "adv-bp-raised",
  grade_2: "adv-bp-raised",
  grade_3: "adv-bp-grade-3",
  low: "adv-bp-low",
};

function adviceFor(
  contentId: string,
  byContentId: Map<string, ChatEntryCandidate>,
): { advice: ChatEntryCandidate } | Record<string, never> {
  const advice = byContentId.get(contentId);
  return advice ? { advice } : {};
}

function pickRelated(
  kind: MeasurementKind,
  byContentId: Map<string, ChatEntryCandidate>,
) {
  return RELATED[kind].flatMap((id) => {
    const entry = byContentId.get(id);
    return entry ? [entry] : [];
  });
}

export function resolveMeasurement(
  question: string,
  entries: ChatEntryCandidate[],
): MeasurementAnswer | null {
  const parsed = parseMeasurement(question);
  if (!parsed) return null;

  const byContentId = new Map(
    entries.filter((e) => e.content_id).map((e) => [e.content_id as string, e]),
  );
  const related = pickRelated(parsed.kind, byContentId);

  if (parsed.kind === "bmi") {
    if (parsed.pregnant) {
      return {
        kind: "bmi",
        outcome: "out_of_scope",
        urgency: "none",
        text: formatBmiRejection("pregnant"),
        related,
      };
    }
    const missing: Array<"weight" | "height" | "age"> = [];
    if (!parsed.weight) missing.push("weight");
    if (!parsed.height) missing.push("height");
    if (parsed.ageYears === undefined) missing.push("age");
    if (missing.length > 0) {
      return {
        kind: "bmi",
        outcome: "needs_input",
        urgency: "none",
        text: formatBmiMissing(missing),
        related: [],
      };
    }
    const result = computeBmi({
      weight: parsed.weight!,
      height: parsed.height!,
      ageYears: parsed.ageYears!,
    });
    if (!result.ok) {
      const outcome =
        result.reason === "age_under_19" || result.reason === "pregnant"
          ? "out_of_scope"
          : "invalid";
      return {
        kind: "bmi",
        outcome,
        urgency: "none",
        text: formatBmiRejection(result.reason),
        related,
      };
    }
    return {
      kind: "bmi",
      outcome: "result",
      urgency: "none",
      text: formatBmi(result),
      related,
      ...adviceFor(BMI_ADVICE[result.asiaPacific], byContentId),
    };
  }

  // Which warning signs count depends on the reading, so classify once to
  // learn the direction, then again with the signs that apply to it.
  const first = classifyBp({
    systolic: parsed.systolic,
    diastolic: parsed.diastolic,
  });
  if (!first.ok) {
    return {
      kind: "bp",
      outcome: "invalid",
      urgency: "none",
      text: formatBpRejection(first.reason),
      related: [],
    };
  }
  const result = classifyBp({
    systolic: parsed.systolic,
    diastolic: parsed.diastolic,
    symptoms: first.category === "low" ? parsed.lowSymptoms : parsed.symptoms,
  });
  if (!result.ok) {
    return {
      kind: "bp",
      outcome: "invalid",
      urgency: "none",
      text: formatBpRejection(result.reason),
      related: [],
    };
  }

  const text = formatBp(result, parsed);
  // Only a raised reading with emergency signs gets the transport-now steps; a
  // low reading with symptoms is "lie them down and refer", already in `text`.
  if (parsed.symptoms && result.hypertensiveRange) {
    const entry = byContentId.get(EMERGENCY_ENTRY);
    const steps = entry
      ? { en: entry.answer_en, fil: entry.answer_fil }
      : EMERGENCY_FALLBACK;
    return {
      kind: "bp",
      outcome: "result",
      urgency: "emergency",
      text: { en: `${steps.en} ${text.en}`, fil: `${steps.fil} ${text.fil}` },
      related,
    };
  }
  return {
    kind: "bp",
    outcome: "result",
    urgency: result.urgent ? "attention" : "none",
    text,
    related,
    ...adviceFor(BP_ADVICE[result.category], byContentId),
  };
}
