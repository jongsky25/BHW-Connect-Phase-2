#!/usr/bin/env node
// Six separately timed Gemini utterances for lesson 1.1.4's animated video.
// Usage: GEMINI_API_KEY=... node scripts/remotion-service-provider-narrate.mjs fil|en

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { synthesizeWithGemini, SERVICE_PROVIDER_STORY_STYLES } from "./lib/tts-providers/gemini.mjs";
import { mp3AudioFrames, spokenText } from "./lib/reference-narration.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "remotion", "public", "service-provider");

async function main() {
  const language = process.argv[2];
  if (language !== "fil" && language !== "en") throw new Error("usage: remotion-service-provider-narrate.mjs <fil|en>");
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const { SERVICE_PROVIDER_BEATS } = await import(pathToFileURL(path.join(root, "remotion", "src", "service-provider", "narration.ts")).href);
  const zones = SERVICE_PROVIDER_BEATS.map((beat, index) => ({ zone: beat.id, index, text: beat[language] }));
  const rendered = await synthesizeWithGemini(zones, language, {
    apiKey: process.env.GEMINI_API_KEY,
    kbps: 32,
    style: SERVICE_PROVIDER_STORY_STYLES[language],
    speak: (zone) => spokenText(zone.text, language),
  });
  const frames = mp3AudioFrames(rendered.audioBytes);
  const durationSeconds = frames.reduce((sum, frame) => sum + frame.samples, 0) / frames[0].sampleRate;
  if (durationSeconds > 89) throw new Error(`service-provider narration exceeds 89 seconds: ${durationSeconds.toFixed(1)} s`);
  if (rendered.timings.length !== SERVICE_PROVIDER_BEATS.length ||
      rendered.timings.some((timing, index) => timing.zone !== SERVICE_PROVIDER_BEATS[index].id))
    throw new Error("Gemini beat timings do not match the authored service-provider sequence");

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
