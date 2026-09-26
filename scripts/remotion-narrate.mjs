#!/usr/bin/env node
// Synthesizes narration audio for the Chapter 2.3 handrub Remotion clip, from
// the owner-approved script in remotion/src/hand-hygiene/narration.ts
// (docs/handrub-clip-enhancement-handoff.md §3). Covered by the Gemini
// script-only exception extended in docs/free-ai-leverage-plan.md §2 —
// authoring-only, admin_authored clip text, well under the daily ceiling.
//
//   GEMINI_API_KEY=... node scripts/remotion-narrate.mjs <fil|en>
//
// Writes remotion/public/hand-hygiene/narration-<lang>.mp3 (one joined clip
// per language, short gaps between beats — scripts/lib/tts-providers/
// gemini.mjs's synthesizeWithGemini) and narration-<lang>.json (each beat's
// start/end ms), which HandrubSteps' calculateMetadata reads to pace the
// composition to the audio.

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { synthesizeWithGemini } from "./lib/tts-providers/gemini.mjs";
import { spokenText } from "./lib/reference-narration.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "remotion", "public", "hand-hygiene");
const FFMPEG = path.join(
  ROOT,
  "remotion",
  "node_modules",
  "@remotion",
  "compositor-linux-x64-gnu",
  "ffmpeg",
);
// The content standard's cap (docs/free-ai-leverage-plan.md).
const KBPS = 32;
// This ffmpeg build has no `volumedetect` (it's a minimal Remotion-bundled
// build with an explicit filter allowlist), but `silencedetect` is enabled.
// If almost the whole clip comes back as "silence" at a generous -50dB
// threshold, treat it as the same class of bug as the 25 Sep 2026 lamejs
// regression that shipped silent 32 kbps files past every unit test
// (nothing decoded them for real).
const SILENCE_NOISE_FLOOR = "-50dB";
const SILENT_FRACTION_THRESHOLD = 0.95;

function checkNotSilent(audioPath, totalSeconds) {
  const result = spawnSync(
    FFMPEG,
    [
      "-i",
      audioPath,
      "-af",
      `silencedetect=noise=${SILENCE_NOISE_FLOOR}:d=0.1`,
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  const log = result.stderr ?? "";
  const silentSeconds = [...log.matchAll(/silence_duration:\s*([\d.]+)/g)].reduce(
    (sum, m) => sum + Number(m[1]),
    0,
  );
  const fraction = silentSeconds / totalSeconds;
  if (fraction >= SILENT_FRACTION_THRESHOLD) {
    throw new Error(
      `${audioPath}: ${(fraction * 100).toFixed(0)}% of the clip is silence at ${SILENCE_NOISE_FLOOR} — looks like a silent render, stop and investigate before rendering`,
    );
  }
  console.log(
    `  check    ${(fraction * 100).toFixed(1)}% silence at ${SILENCE_NOISE_FLOOR} (not silent)`,
  );
}

async function main() {
  const language = process.argv[2];
  if (language !== "fil" && language !== "en") {
    throw new Error("usage: remotion-narrate.mjs <fil|en>");
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const { HANDRUB_NARRATION } = await import(
    path.join(ROOT, "remotion", "src", "hand-hygiene", "narration.ts")
  );
  const zones = HANDRUB_NARRATION.map((beat, index) => ({
    zone: beat.id,
    index,
    text: beat[language],
  }));

  console.log(`Synthesizing ${zones.length} beats (${language})...`);
  const result = await synthesizeWithGemini(zones, language, {
    apiKey,
    kbps: KBPS,
    speak: (zone) => spokenText(zone.text, language),
  });

  mkdirSync(OUT_DIR, { recursive: true });
  const audioPath = path.join(OUT_DIR, `narration-${language}.mp3`);
  const timingsPath = path.join(OUT_DIR, `narration-${language}.json`);
  writeFileSync(audioPath, result.audioBytes);
  writeFileSync(
    timingsPath,
    JSON.stringify(
      {
        language,
        durationSeconds: result.durationSeconds,
        beats: result.timings,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(
    `  audio    ${audioPath} (${(result.audioBytes.length / 1024).toFixed(0)} KB, ${result.durationSeconds.toFixed(1)} s)`,
  );
  console.log(`  timings  ${timingsPath}`);
  checkNotSilent(audioPath, result.durationSeconds);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
