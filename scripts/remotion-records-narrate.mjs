#!/usr/bin/env node
// Render the bilingual voiceover for the lesson 1.1.5 records animation.
// One Gemini utterance per beat yields exact visual and caption timing.
//
//   GEMINI_API_KEY=... node scripts/remotion-records-narrate.mjs fil
//   GEMINI_API_KEY=... node scripts/remotion-records-narrate.mjs en

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { synthesizeWithGemini, RECORDS_STORY_STYLES } from "./lib/tts-providers/gemini.mjs";
import { mp3AudioFrames, spokenText } from "./lib/reference-narration.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "remotion", "public", "records");

async function main() {
  const language = process.argv[2];
  if (language !== "fil" && language !== "en") throw new Error("usage: remotion-records-narrate.mjs <fil|en>");
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const { RECORDS_BEATS } = await import(pathToFileURL(path.join(root, "remotion", "src", "records", "narration.ts")).href);
  const zones = RECORDS_BEATS.map((beat, index) => ({ zone: beat.id, index, text: beat[language] }));
  const rendered = await synthesizeWithGemini(zones, language, {
    apiKey: process.env.GEMINI_API_KEY,
    kbps: 32,
    style: RECORDS_STORY_STYLES[language],
    speak: (zone) => spokenText(zone.text, language),
  });
  const frames = mp3AudioFrames(rendered.audioBytes);
  const durationSeconds = frames.reduce((sum, frame) => sum + frame.samples, 0) / frames[0].sampleRate;
  if (durationSeconds > 89) throw new Error(`records animation narration exceeds 89 seconds: ${durationSeconds.toFixed(1)} s`);
  if (rendered.timings.length !== RECORDS_BEATS.length ||
      rendered.timings.some((timing, index) => timing.zone !== RECORDS_BEATS[index].id))
    throw new Error("Gemini beat timings do not match the authored records sequence");

  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `narration-${language}.mp3`), rendered.audioBytes);
  writeFileSync(path.join(outDir, `narration-${language}.json`), JSON.stringify({
    language,
    durationSeconds: Number(durationSeconds.toFixed(3)),
    beats: rendered.timings,
  }, null, 2) + "\n");
  console.log(`${language}: ${durationSeconds.toFixed(1)} s; ${rendered.audioBytes.length} bytes; ${rendered.timings.length} beats`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
