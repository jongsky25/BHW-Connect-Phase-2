import { describe, expect, it } from "vitest";
import { parseMeasurement } from "./parse";

describe("parseMeasurement — blood pressure", () => {
  it.each([
    ["BP 150/95", 150, 95],
    ["150/95 ang presyon niya", 150, 95],
    ["mataas ba ang 140 / 90?", 140, 90],
    ["120 over 80 normal ba", 120, 80],
    ["presyon ko 130 sa 85", 130, 85],
    ["blood pressure 118-76", 118, 76],
  ])("%s", (q, s, d) => {
    expect(parseMeasurement(q)).toMatchObject({
      kind: "bp",
      systolic: s,
      diastolic: d,
      implausible: false,
    });
  });

  it("ignores slash numbers that are not a reading", () => {
    expect(parseMeasurement("meeting sa 12/10")).toBeNull();
    expect(parseMeasurement("anong oras 3 sa 4")).toBeNull();
    expect(parseMeasurement("ilang tao 120-80 sa barangay")).toBeNull();
  });

  it("flags an implausible reading when a BP word is present", () => {
    expect(parseMeasurement("BP 80/120")).toMatchObject({
      kind: "bp",
      implausible: true,
    });
  });

  it("detects symptoms by whole phrase", () => {
    expect(parseMeasurement("160/100 sumasakit ang dibdib")).toMatchObject({
      symptoms: true,
    });
    expect(parseMeasurement("BP 150/95 nahihilo siya")).toMatchObject({
      symptoms: false,
      lowSymptoms: true,
    });
    expect(parseMeasurement("BP 150/95 maayos ang pakiramdam")).toMatchObject({
      symptoms: false,
    });
  });
});

describe("parseMeasurement — BMI", () => {
  it("parses weight, height and age in English", () => {
    expect(
      parseMeasurement("BMI for 62 kg, 160 cm, 35 years old"),
    ).toMatchObject({
      kind: "bmi",
      weight: { value: 62, unit: "kg" },
      height: { value: 160, unit: "cm" },
      ageYears: 35,
      pregnant: false,
    });
  });

  it("parses Taglish phrasing", () => {
    expect(
      parseMeasurement("BMI ko 62 kilo 1.6 m 35 taong gulang"),
    ).toMatchObject({
      weight: { value: 62, unit: "kg" },
      height: { value: 1.6, unit: "m" },
      ageYears: 35,
    });
    expect(
      parseMeasurement("timbang 70 taas 165 edad 40, ano bmi"),
    ).toMatchObject({
      weight: { value: 70, unit: "kg" },
      height: { value: 165, unit: "cm" },
      ageYears: 40,
    });
  });

  it("parses pounds and feet/inches", () => {
    expect(parseMeasurement("bmi 150 lbs 5'3 age 30")).toMatchObject({
      weight: { value: 150, unit: "lb" },
      height: { unit: "ft_in", feet: 5, inches: 3 },
      ageYears: 30,
    });
    expect(parseMeasurement("bmi 150 lb 5 ft 3 in age 30")).toMatchObject({
      height: { unit: "ft_in", feet: 5, inches: 3 },
    });
  });

  it("reports missing inputs rather than guessing", () => {
    const r = parseMeasurement("BMI ko 62 kg");
    expect(r).toMatchObject({ kind: "bmi", weight: { value: 62 } });
    expect(r).toMatchObject({ height: undefined, ageYears: undefined });
  });

  it("notes pregnancy", () => {
    expect(
      parseMeasurement("BMI 62 kg 160 cm 28 taong gulang buntis"),
    ).toMatchObject({ pregnant: true });
  });

  it("leaves pure knowledge questions to the KB", () => {
    expect(parseMeasurement("ano ang BMI?")).toBeNull();
    expect(parseMeasurement("What do the BMI categories mean?")).toBeNull();
    expect(
      parseMeasurement("Why does another guideline call 130/80 high?"),
    ).toBeNull();
    expect(
      parseMeasurement("Bakit mataas ang 130/80 sa ibang gabay?"),
    ).toBeNull();
  });

  it("treats 'or higher' as a threshold question, not a reading", () => {
    expect(
      parseMeasurement(
        "The blood pressure is 180/110 or higher, what do I tell the client?",
      ),
    ).toBeNull();
    expect(
      parseMeasurement(
        "Ano ang sasabihin ko sa kliyente kung 180/110 o mas mataas ang presyon?",
      ),
    ).toBeNull();
    expect(parseMeasurement("BP 180/110")).toMatchObject({ kind: "bp" });
  });
});
