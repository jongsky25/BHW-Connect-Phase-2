// Model-mediated listening to actual educational MP3 bytes; no human certification.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { buildNarrationZones } from "./lib/narration-zones.mjs";

const root = path.resolve(import.meta.dirname, "..");
const language = process.argv[2];
if (!["ceb", "hil"].includes(language)) throw new Error("Pass ceb or hil");
if (!process.env.GEMINI_API_KEY) throw new Error("Configured Gemini secret is unavailable");
const directory = path.join(root, "content/training/day1-basic-competencies/modules/02-uhc-act/lessons/uhc-coverage");
const pilot = JSON.parse(readFileSync(path.join(directory, `pilot.${language}.json`), "utf8"));
const story = JSON.parse(readFileSync(path.join(root, `remotion/public/uhc-purpose/narration-${language}.json`), "utf8"));
const records = pilot.read_sections.map(section => ({ id: section.id,
  file: path.join(root, "public", pilot.narration[section.id].src.slice(1)),
  expected: buildNarrationZones(section).map(zone => zone.text).join(" ") }));
records.push({ id: "story", file: path.join(root, `remotion/public/uhc-purpose/narration-${language}.mp3`), expected: story.beats.map(beat => beat.text).join(" ") });
const report = { date: new Date().toISOString(), language, source_commit: process.env.GITHUB_SHA ?? null,
  method: "Gemini model-mediated listening to actual MP3 bytes; not human listening, native-speaker certification, owner approval or policy review",
  model: "gemini-3.8-flash", records: [] };
const save = () => writeFileSync(path.join(directory, `audio-review.${language}.json`), JSON.stringify(report, null, 2) + "\n");
function outputText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(outputText).filter(Boolean).join("\n");
  if (!value || typeof value !== "object") return "";
  if (typeof value.output_text === "string") return value.output_text;
  if (value.type === "text" && typeof value.text === "string") return value.text;
  return outputText(value.outputs ?? value.output ?? value.content ?? value.steps?.filter(step => step.type === "model_output") ?? []);
}
for (const record of records) {
  const bytes = readFileSync(record.file);
  const prompt = `Listen to the attached actual ${language === "ceb" ? "Philippine Cebuano (Bisaya)" : "Iloilo/Western Visayas Hiligaynon (Ilonggo)"} educational narration. Transcribe the entire audible speech before comparing it with the supplied expected text. Do not invent missing words. Check intelligibility throughout, language consistency, pronunciation/stress and sentence intonation, purposeful expressive pitch/pace changes, repeated or added words, missing sentences, cut-off words or endings, and initialisms UHC, NHIP, RHU and the name Vlanche. Vlanche should be one syllable vlanch. State concrete timestamps for concerns and uncertainty. Return JSON with transcript, speech_present, clipped_ending, wording_concerns, language_concerns, pronunciation_concerns, delivery and other_concerns. Do not claim a human/native-speaker review or approval. This is fictional training material with no patient data. Expected authored text: ${record.expected}`;
  let review;
  for (let attempt = 0; attempt < 3; attempt++) {
    // Build-time analysis of fictional, admin-authored educational media only.
    // eslint-disable-next-line no-restricted-syntax
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST", headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ model: report.model, input: [{ type: "text", text: prompt }, { type: "audio", data: bytes.toString("base64"), mime_type: "audio/mp3" }], generation_config: { temperature: 0 } }),
      signal: AbortSignal.timeout(180000),
    });
    if (response.ok) { review = outputText(await response.json()); if (!review) throw new Error("Empty audio review"); break; }
    if (attempt < 2 && (response.status === 429 || response.status >= 500)) { await new Promise(resolve => setTimeout(resolve, 4000 * (attempt + 1))); continue; }
    throw new Error(`Audio review unavailable: HTTP ${response.status}`);
  }
  report.records.push({ id: record.id, sha256: createHash("sha256").update(bytes).digest("hex"), expected_text: record.expected, model_response: review });
  save(); console.log(`Reviewed actual ${language}/${record.id} audio`);
}
