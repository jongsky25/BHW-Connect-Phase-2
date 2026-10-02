import type {
  AsiaPacificBmiCategory,
  BmiRejection,
  BmiResult,
  WhoBmiCategory,
} from "./bmi";
import type { BpCategory, BpRejection, BpResult } from "./bp";

// Bilingual wording for classifier results. Kept beside the classifiers so a
// reviewer reads the thresholds and what a BHW is told about them together.
// Every message states that it is a screening category and defers the
// referral cut-off to the PhilPEN protocol, matching the KB entries.

export type Bilingual = { en: string; fil: string };

const SCREENING_EN =
  "This is a screening category, not a diagnosis; the clinician decides.";
const SCREENING_FIL =
  "Ito ay kategorya sa screening, hindi diagnosis; ang clinician ang magpapasya.";

const AP_LABEL: Record<AsiaPacificBmiCategory, Bilingual> = {
  underweight: { en: "underweight", fil: "underweight (kulang sa timbang)" },
  normal: { en: "normal", fil: "normal" },
  overweight: { en: "overweight (at risk)", fil: "overweight (may panganib)" },
  obese_1: { en: "obese class I", fil: "obese class I" },
  obese_2: { en: "obese class II", fil: "obese class II" },
};

const WHO_LABEL: Record<WhoBmiCategory, Bilingual> = {
  underweight: { en: "underweight", fil: "underweight (kulang sa timbang)" },
  normal: { en: "normal", fil: "normal" },
  overweight: { en: "overweight (pre-obese)", fil: "overweight (pre-obese)" },
  obese_1: { en: "obese class I", fil: "obese class I" },
  obese_2: { en: "obese class II", fil: "obese class II" },
  obese_3: { en: "obese class III", fil: "obese class III" },
};

export function formatBmi(result: Extract<BmiResult, { ok: true }>): Bilingual {
  const ap = AP_LABEL[result.asiaPacific];
  const who = WHO_LABEL[result.who];
  return {
    en: `BMI ${result.bmi.toFixed(1)}. Asia-Pacific category: ${ap.en}. WHO category: ${who.en}. ${SCREENING_EN}`,
    fil: `BMI ${result.bmi.toFixed(1)}. Kategorya ng Asia-Pacific: ${ap.fil}. Kategorya ng WHO: ${who.fil}. ${SCREENING_FIL}`,
  };
}

const BMI_REJECTION: Record<BmiRejection, Bilingual> = {
  invalid_number: {
    en: "I could not read those numbers. Please send weight, height and age, for example: BMI 62 kg 160 cm 35 years old.",
    fil: "Hindi ko nabasa ang mga numero. Ipadala ang timbang, taas at edad, halimbawa: BMI 62 kg 160 cm 35 taong gulang.",
  },
  age_under_19: {
    en: "These BMI categories are for adults aged 19 and over. Children and teenagers are assessed against growth charts by age; please refer to the health worker.",
    fil: "Ang mga kategorya ng BMI na ito ay para sa nasa hustong gulang na 19 pataas. Ang mga bata at kabataan ay sinusuri gamit ang growth chart ayon sa edad; i-refer sa health worker.",
  },
  pregnant: {
    en: "These BMI categories are not used in pregnancy. Record the weight and height and tell the midwife.",
    fil: "Hindi ginagamit ang mga kategorya ng BMI na ito sa pagbubuntis. Itala ang timbang at taas at sabihin sa midwife.",
  },
  weight_out_of_range: {
    en: "That weight does not look right (expected 20 to 400 kg). Please check the scale and the unit, then try again.",
    fil: "Mukhang mali ang timbang (inaasahan ang 20 hanggang 400 kg). Suriin ang timbangan at ang yunit, saka subukan ulit.",
  },
  height_out_of_range: {
    en: "That height does not look right (expected 100 to 250 cm). Please check the measurement and the unit, then try again.",
    fil: "Mukhang mali ang taas (inaasahan ang 100 hanggang 250 cm). Suriin ang sukat at ang yunit, saka subukan ulit.",
  },
};

export function formatBmiRejection(reason: BmiRejection): Bilingual {
  return BMI_REJECTION[reason];
}

/** What is still missing for a BMI, so one reply can ask for all of it. */
export function formatBmiMissing(
  missing: Array<"weight" | "height" | "age">,
): Bilingual {
  const en = { weight: "weight", height: "height", age: "age" };
  const fil = { weight: "timbang", height: "taas", age: "edad" };
  return {
    en: `To work out the BMI I also need the ${missing.map((m) => en[m]).join(", ")}. Please send everything in one message, for example: BMI 62 kg 160 cm 35 years old. Not for pregnant women or anyone under 19.`,
    fil: `Para makuwenta ang BMI, kailangan ko rin ang ${missing.map((m) => fil[m]).join(", ")}. Ipadala ang lahat sa isang mensahe, halimbawa: BMI 62 kg 160 cm 35 taong gulang. Hindi para sa buntis o sa wala pang 19.`,
  };
}

const BP_LABEL: Record<Exclude<BpCategory, "low">, Bilingual> = {
  optimal: { en: "optimal", fil: "optimal" },
  normal: { en: "normal", fil: "normal" },
  high_normal: { en: "high-normal", fil: "high-normal" },
  grade_1: {
    en: "grade 1 hypertension range",
    fil: "grade 1 na saklaw ng altapresyon",
  },
  grade_2: {
    en: "grade 2 hypertension range",
    fil: "grade 2 na saklaw ng altapresyon",
  },
  grade_3: {
    en: "grade 3, the highest category",
    fil: "grade 3, ang pinakamataas na kategorya",
  },
};

// The Philippine Society of Hypertension 2020 CPG groups readings in three
// bands. They line up exactly with the ESC/ESH grades used here: its "normal"
// (<120/80) is ESC "optimal", its "borderline" (120-139/80-89) is ESC "normal"
// plus "high-normal", and its "hypertension" (>=140/90) is grades 1 to 3. So
// the label follows from the category, with no second set of cut-offs.
const PH_BAND: Record<Exclude<BpCategory, "low">, Bilingual> = {
  optimal: { en: "normal", fil: "normal" },
  normal: { en: "borderline", fil: "borderline" },
  high_normal: { en: "borderline", fil: "borderline" },
  grade_1: { en: "hypertension range", fil: "saklaw ng altapresyon" },
  grade_2: { en: "hypertension range", fil: "saklaw ng altapresyon" },
  grade_3: { en: "hypertension range", fil: "saklaw ng altapresyon" },
};

export function formatBp(
  result: Extract<BpResult, { ok: true }>,
  reading: { systolic: number; diastolic: number },
): Bilingual {
  const head = `${reading.systolic}/${reading.diastolic} mmHg`;
  const parts: Bilingual[] = [];

  if (result.category === "low") {
    parts.push({
      en: `${head}: a low reading. A top number below 90 or a bottom number below 60 is generally treated as low, but some people are normally this low and feel fine, so go by symptoms: dizziness on standing, weakness, cold clammy skin, confusion or fainting mean lie them down and refer. Also check the cuff size and position.`,
      fil: `${head}: mababang resulta. Ang itaas na numerong mas mababa sa 90 o ang ibabang numerong mas mababa sa 60 ay karaniwang itinuturing na mababa, ngunit may mga taong karaniwang ganito kababa at maayos ang pakiramdam, kaya sintomas ang sundin: pagkahilo sa pagtayo, panghihina, malamig at basang balat, pagkalito o pagkahimatay ay nangangahulugang pahigain at i-refer. Suriin din ang laki at pagkakalagay ng cuff.`,
    });
  } else {
    const label = BP_LABEL[result.category];
    const ph = PH_BAND[result.category];
    parts.push({
      en: `${head}: ${label.en}. Philippine guideline: ${ph.en}.`,
      fil: `${head}: ${label.fil}. Ayon sa gabay ng Pilipinas: ${ph.fil}.`,
    });
    if (result.isolatedSystolic) {
      parts.push({
        en: "Only the top number is raised (isolated systolic); it still counts as a raised reading.",
        fil: "Ang itaas na numero lamang ang mataas (isolated systolic); mataas na resulta pa rin ito.",
      });
    }
    if (result.category === "grade_3") {
      parts.push({
        en: "This is the highest category (180/110 or above). Ask now about chest pain, trouble breathing, a severe headache, weakness on one side, trouble speaking, changes in vision, confusion or fainting: if there is any, treat it as an emergency. If there is none, arrange for them to be seen at the health facility today and do not send them home to wait. If your LGU's PhilPEN protocol sets a different timing for this level, follow it.",
        fil: "Ito ang pinakamataas na kategorya (180/110 pataas). Itanong agad kung may sakit sa dibdib, hirap huminga, matinding sakit ng ulo, panghihina sa isang bahagi, hirap magsalita, pagbabago ng paningin, pagkalito o pagkahimatay: kung mayroon, ituring itong emergency. Kung wala, ayusin na masuri sila sa pasilidad ngayong araw at huwag silang pauwiin para maghintay. Kung ibang oras ang itinakda ng PhilPEN protocol ng inyong LGU para sa antas na ito, iyon ang sundin.",
      });
    } else if (result.hypertensiveRange) {
      parts.push({
        en: "One reading is not a diagnosis: hypertension is confirmed on at least two readings on two separate days. Record it and refer or repeat as your PhilPEN protocol directs.",
        fil: "Hindi diagnosis ang isang resulta: kinukumpirma ang altapresyon sa hindi bababa sa dalawang pagsukat sa dalawang magkaibang araw. Itala ito at mag-refer o ulitin ayon sa PhilPEN protocol.",
      });
    }
  }
  parts.push({ en: SCREENING_EN, fil: SCREENING_FIL });
  return {
    en: parts.map((p) => p.en).join(" "),
    fil: parts.map((p) => p.fil).join(" "),
  };
}

const BP_REJECTION: Record<BpRejection, Bilingual> = {
  invalid_number: {
    en: "I could not read that reading. Please send it like this: BP 120/80.",
    fil: "Hindi ko nabasa ang resulta. Ipadala ito ng ganito: BP 120/80.",
  },
  systolic_out_of_range: {
    en: "The top number does not look right (expected 50 to 300). Please measure again.",
    fil: "Mukhang mali ang itaas na numero (inaasahan ang 50 hanggang 300). Sukatin ulit.",
  },
  diastolic_out_of_range: {
    en: "The bottom number does not look right (expected 30 to 200). Please measure again.",
    fil: "Mukhang mali ang ibabang numero (inaasahan ang 30 hanggang 200). Sukatin ulit.",
  },
  systolic_not_above_diastolic: {
    en: "The top number should be higher than the bottom number. Check you wrote them in the right order, or measure again.",
    fil: "Dapat mas mataas ang itaas na numero kaysa sa ibaba. Tiyaking tama ang pagkakasunod, o sukatin ulit.",
  },
};

export function formatBpRejection(reason: BpRejection): Bilingual {
  return BP_REJECTION[reason];
}

export const EMERGENCY_FALLBACK: Bilingual = {
  en: "Treat this as an emergency. Arrange transport to the facility now, with someone accompanying them, and do not give any medicine.",
  fil: "Ituring itong emergency. Ayusin ang transport patungo sa pasilidad ngayon din, may kasamang tao, at huwag magbigay ng anumang gamot.",
};
