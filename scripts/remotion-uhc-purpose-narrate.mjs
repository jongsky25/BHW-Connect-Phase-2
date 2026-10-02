#!/usr/bin/env node
// Generate the six measured Gemini narration beats for lesson 1.2.1.
// Usage: GEMINI_API_KEY=... node scripts/remotion-uhc-purpose-narrate.mjs fil|en

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { synthesizeWithGemini, GEMINI_TTS_MODEL, GEMINI_VOICE } from "./lib/tts-providers/gemini.mjs";
import { mp3AudioFrames, spokenText } from "./lib/reference-narration.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "remotion", "public", "uhc-purpose");
const styles = {
  fil: "Speak in natural Filipino (Tagalog) as a lively, warm community health storyteller. Begin with Mang Ernesto's sincere question and Vlanche listening attentively. Make the UHC aim hopeful, the distinction between program inclusion and a covered consultation clear, and Vlanche's final answer reassuring but careful. Vary pitch, emphasis, and pace naturally between the six beats. Keep the health guidance respectful and easy to follow. Do not add or change words.",
  en: "Speak in natural Philippine English as a lively, warm community health storyteller. Begin with Mang Ernesto's sincere question and Vlanche listening attentively. Make the UHC aim hopeful, the distinction between program inclusion and a covered consultation clear, and Vlanche's final answer reassuring but careful. Vary pitch, emphasis, and pace naturally between the six beats. Keep the health guidance respectful and easy to follow. Do not add or change words.",
};

async function main() {
  const language = process.argv[2];
  if (language !== "fil" && language !== "en") throw new Error("usage: remotion-uhc-purpose-narrate.mjs <fil|en>");
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const { UHC_PURPOSE_BEATS } = await import(pathToFileURL(path.join(root, "remotion", "src", "uhc-purpose", "narration.ts")).href);
  const zones = UHC_PURPOSE_BEATS.map((beat, index) => ({ zone: beat.id, index, text: beat[language] }));
  const rendered = await synthesizeWithGemini(zones, language, {
    apiKey: process.env.GEMINI_API_KEY,
    kbps: 32,
    style: styles[language],
    speak: (zone) => spokenText(zone.text, language),
  });
  const frames = mp3AudioFrames(rendered.audioBytes);
  const durationSeconds = frames.reduce((sum, frame) => sum + frame.samples, 0) / frames[0].sampleRate;
  if (durationSeconds > 110) throw new Error(`UHC narration exceeds 110 seconds: ${durationSeconds.toFixed(1)} s`);
  if (rendered.timings.length !== UHC_PURPOSE_BEATS.length ||
      rendered.timings.some((timing, index) => timing.zone !== UHC_PURPOSE_BEATS[index].id || timing.end_ms <= timing.start_ms))
    throw new Error("Gemini beat timings do not match the authored UHC sequence");
  if (rendered.timings.at(-1).end_ms > durationSeconds * 1000 + 50)
    throw new Error("Gemini beat timings exceed the encoded MP3 duration");

  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `narration-${language}.mp3`), rendered.audioBytes);
  writeFileSync(path.join(outDir, `narration-${language}.json`), JSON.stringify({
    language,
    provider: "gemini",
    model: GEMINI_TTS_MODEL,
    voice: GEMINI_VOICE,
    durationSeconds: Number(durationSeconds.toFixed(3)),
    beats: rendered.timings,
  }, null, 2) + "\n");
  console.log(`${language}: ${durationSeconds.toFixed(1)} s; ${rendered.audioBytes.length} bytes; ${rendered.timings.length} beats`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
