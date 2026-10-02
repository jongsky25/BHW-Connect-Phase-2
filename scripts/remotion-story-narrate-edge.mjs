#!/usr/bin/env node
// Revoice an authored companion story with the keyless Edge Read Aloud voices.
// Usage: node scripts/remotion-story-narrate-edge.mjs <story> <fil|en>
// The generated MP3 and exact beat timings live under remotion/public/<story>/.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assembleNarration, spokenText } from "./lib/reference-narration.mjs";
import { synthesizeUtterance } from "./lib/tts-providers/edge-read-aloud.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stories = {
  "roles-hepo": "ROLES_HEPO_BEATS",
  "health-educator": "HEALTH_EDUCATOR_BEATS",
  "community-organizer": "COMMUNITY_ORGANIZER_BEATS",
  "service-provider": "SERVICE_PROVIDER_BEATS",
  records: "RECORDS_BEATS",
  "uhc-purpose": "UHC_PURPOSE_BEATS",
};
const voice = { fil: "fil-PH-BlessicaNeural", en: "en-PH-RosaNeural" };

async function main() {
  const [story, language] = process.argv.slice(2);
  if (!stories[story] || !voice[language])
    throw new Error("usage: remotion-story-narrate-edge.mjs <story> <fil|en>");
  const source = path.join(root, "remotion", "src", story, "narration.ts");
  const beats = (await import(pathToFileURL(source).href))[stories[story]];
  if (!Array.isArray(beats) || !beats.length) throw new Error(`${story} has no authored beats`);
  const zones = beats.map((beat, index) => ({ zone: beat.id, index, text: beat[language] }));
  const clips = [];
  for (const zone of zones) {
    clips.push(await synthesizeUtterance(spokenText(zone.text, language), voice[language]));
  }
  const rendered = assembleNarration(zones, clips);
  const out = path.join(root, "remotion", "public", story);
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, `narration-${language}.mp3`), rendered.bytes);
  writeFileSync(path.join(out, `narration-${language}.json`), JSON.stringify({
    language,
    durationSeconds: rendered.durationSeconds,
    beats: rendered.timings,
  }, null, 2) + "\n");
  console.log(`${story}/${language}: ${rendered.durationSeconds.toFixed(1)} s, ${zones.length} beats`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
