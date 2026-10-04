#!/usr/bin/env node
// Usage: GEMINI_API_KEY=... node scripts/remotion-bhs-resources-narrate.mjs fil|en
// Each story scene is synthesized separately, then timed by PCM sample count.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { synthesizeWithGemini, GEMINI_TTS_MODEL, GEMINI_VOICE, BHS_RESOURCES_STORY_STYLES } from "./lib/tts-providers/gemini.mjs";
import { mp3AudioFrames, spokenText } from "./lib/reference-narration.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "remotion", "public", "bhs-resources");
const styles = BHS_RESOURCES_STORY_STYLES;

async function main() {
  const language = process.argv[2];
  if (language !== "fil" && language !== "en") throw new Error("usage: remotion-bhs-resources-narrate.mjs <fil|en>");
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const { BHS_RESOURCES_BEATS } = await import(pathToFileURL(path.join(root, "remotion", "src", "bhs-resources", "narration.ts")).href);
  const zones = BHS_RESOURCES_BEATS.map((beat, index) => ({ zone: beat.id, index, text: beat[language] }));
  const rendered = await synthesizeWithGemini(zones, language, {
    apiKey: process.env.GEMINI_API_KEY,
    kbps: 32,
    style: styles[language],
    speak: (zone) => spokenText(zone.text, language),
  });
  const frames = mp3AudioFrames(rendered.audioBytes);
  const durationSeconds = frames.reduce((sum, frame) => sum + frame.samples, 0) / frames[0].sampleRate;
  if (durationSeconds > 88) throw new Error(`Resources narration exceeds the 90-second lesson limit: ${durationSeconds.toFixed(1)} s`);
  if (rendered.timings.length !== BHS_RESOURCES_BEATS.length ||
      rendered.timings.some((timing, index) => timing.zone !== BHS_RESOURCES_BEATS[index].id || timing.end_ms <= timing.start_ms))
    throw new Error("Gemini scene timings do not match the authored sequence");
  if (rendered.timings.at(-1).end_ms > durationSeconds * 1000 + 50)
    throw new Error("Gemini scene timings exceed the encoded MP3 duration");

  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `narration-${language}.mp3`), rendered.audioBytes);
  writeFileSync(path.join(outDir, `narration-${language}.json`), JSON.stringify({
    language, provider: "gemini", model: GEMINI_TTS_MODEL, voice: GEMINI_VOICE,
    speech_style: styles[language], durationSeconds: Number(durationSeconds.toFixed(3)), beats: rendered.timings,
  }, null, 2) + "\n");
  console.log(`${language}: ${durationSeconds.toFixed(1)} s; ${rendered.audioBytes.length} bytes; ${rendered.timings.length} scenes`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
