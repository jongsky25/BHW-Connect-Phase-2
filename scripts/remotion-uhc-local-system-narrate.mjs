#!/usr/bin/env node
// Run with the existing secure GEMINI_API_KEY; never substitute another provider.
import {mkdirSync, writeFileSync} from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {synthesizeWithGemini, GEMINI_TTS_MODEL, GEMINI_VOICE, LOCAL_SYSTEM_STORY_STYLES} from "./lib/tts-providers/gemini.mjs";
import {mp3AudioFrames, spokenText} from "./lib/reference-narration.mjs";

const root = path.resolve(import.meta.dirname, "..");
async function main() {
  const language = process.argv[2];
  if (!["fil", "en"].includes(language)) throw new Error("usage: remotion-uhc-local-system-narrate.mjs fil|en");
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set; no fallback provider is authorised");
  const {LOCAL_SYSTEM_BEATS} = await import(pathToFileURL(path.join(root, "remotion/src/uhc-local-system/narration.ts")).href);
  const zones = LOCAL_SYSTEM_BEATS.map((beat, index) => ({zone: beat.id, index, text: beat[language]}));
  const rendered = await synthesizeWithGemini(zones, language, {
    apiKey: process.env.GEMINI_API_KEY, kbps: 32, style: LOCAL_SYSTEM_STORY_STYLES[language],
    speak: zone => spokenText(zone.text, language),
  });
  const frames = mp3AudioFrames(rendered.audioBytes);
  const seconds = frames.reduce((sum, frame) => sum + frame.samples / frame.sampleRate, 0);
  if (seconds > 88) throw new Error(`Local-system narration exceeds the 90-second budget with its tail: ${seconds.toFixed(2)} s`);
  if (rendered.timings.length !== zones.length || rendered.timings.some((b, i) => b.zone !== zones[i].zone || b.end_ms <= b.start_ms) ||
    rendered.timings.at(-1).end_ms > seconds * 1000 + 50) throw new Error("Measured timings do not match the authored scenes");
  const out = path.join(root, "remotion/public/uhc-local-system");
  mkdirSync(out, {recursive: true});
  writeFileSync(path.join(out, `narration-${language}.mp3`), rendered.audioBytes);
  writeFileSync(path.join(out, `narration-${language}.json`), JSON.stringify({
    language, provider: "gemini", model: GEMINI_TTS_MODEL, voice: GEMINI_VOICE,
    durationSeconds: Number(seconds.toFixed(3)), beats: rendered.timings,
  }, null, 2) + "\n");
  console.log(`${language}: ${seconds.toFixed(3)} s; ${rendered.audioBytes.length} bytes; ${zones.length} measured beats`);
}
main().catch(error => {console.error(error.message); process.exitCode = 1;});
