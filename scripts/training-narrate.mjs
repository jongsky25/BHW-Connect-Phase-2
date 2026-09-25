#!/usr/bin/env node
// Pre-renders Read-mode narration for converted Reference Manual lessons and
// commits it as static files (public/training/audio/...) plus a manifest
// (content/training/day1-basic-competencies/narration.json). Nothing is
// written to Supabase and lesson revisions are untouched: the lesson page
// reads the manifest and shows a player only when the recorded sentence
// text still matches the published revision's text exactly.
//
//   npm run training:narrate                          # dry run, every converted subchapter
//   npm run training:narrate -- --modules 02-uhc-act  # dry run, one subchapter
//   npm run training:narrate -- --apply               # render missing/stale audio
//
// Voices: fil-PH-BlessicaNeural (Filipino), en-PH-RosaNeural (Philippine
// English), via the Edge Read Aloud service (no key; honours HTTPS_PROXY).
// Unchanged sections are skipped by content hash, so re-runs only render
// edited text. --apply also deletes audio files of the processed subchapters
// that the new manifest no longer references (git history keeps them).

import { existsSync, readdirSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadReferenceModule } from "./lib/reference-content.mjs";
import {
  AUDIO_ROOT,
  assembleNarration,
  buildManifest,
  planReferenceNarration,
  referencedSources,
  sha256,
  spokenText,
} from "./lib/reference-narration.mjs";
import { synthesizeUtterance } from "./lib/tts-providers/edge-read-aloud.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const courseRoot = path.join(root, "content/training/day1-basic-competencies");
const modulesRoot = path.join(courseRoot, "modules");
const publicRoot = path.join(root, "public");
const manifestPath = path.join(courseRoot, "narration.json");

function parseArgs(argv) {
  const args = { apply: false, modules: null, concurrency: 3 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg === "--modules") args.modules = argv[++i].split(",").map((m) => m.trim());
    else if (arg === "--concurrency") args.concurrency = Math.max(1, Number(argv[++i]) || 1);
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

const publicFile = (src) => path.join(publicRoot, src.slice(1));
const fileHash = (src) => (existsSync(publicFile(src)) ? sha256(readFileSync(publicFile(src))) : null);

async function pool(items, size, work) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) await work(items[next++]);
    }),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const converted = readdirSync(modulesRoot).filter((m) => existsSync(path.join(modulesRoot, m, "lessons")));
  const keys = args.modules ?? converted;
  for (const key of keys) {
    if (!converted.includes(key)) throw new Error(`${key} is not a converted subchapter (no lessons/ folder)`);
  }
  const modules = keys.map((key) => ({ key, lessons: loadReferenceModule(path.join(modulesRoot, key), publicRoot).lessons }));
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { lessons: {} };
  const items = planReferenceNarration(modules, manifest, fileHash);
  const toRender = items.filter((i) => i.action === "render");

  console.log(`\n${args.apply ? "APPLY" : "DRY RUN"} — ${keys.join(", ")}`);
  console.log(`  sections × languages: ${items.length} (render ${toRender.length}, unchanged ${items.length - toRender.length})`);
  console.log(`  characters to synthesize: ${toRender.reduce((n, i) => n + i.charCount, 0)}`);
  if (!args.apply) {
    console.log("\n  nothing was written — re-run with --apply\n");
    return;
  }

  const results = [];
  let done = 0;
  await pool(items, args.concurrency, async (item) => {
    if (item.action === "skip") {
      results.push({ ...item, sha256: item.existing.sha256, durationSeconds: item.existing.duration_seconds, timings: item.existing.timings });
      return;
    }
    const clips = [];
    for (const zone of item.zones) clips.push(await synthesizeUtterance(spokenText(zone.text, item.language), item.voice));
    const audio = assembleNarration(item.zones, clips);
    mkdirSync(path.dirname(publicFile(item.src)), { recursive: true });
    writeFileSync(publicFile(item.src), audio.bytes);
    results.push({ ...item, sha256: sha256(audio.bytes), durationSeconds: audio.durationSeconds, timings: audio.timings });
    done += 1;
    console.log(`  ✓ [${done}/${toRender.length}] ${item.lessonKey} ${item.sectionId} (${item.language}) ${audio.durationSeconds}s`);
  });

  // Deterministic manifest order regardless of pool completion order.
  results.sort((a, b) =>
    `${a.lessonKey}\0${a.sectionId}\0${a.language}`.localeCompare(`${b.lessonKey}\0${b.sectionId}\0${b.language}`),
  );
  const next = buildManifest(manifest, modules, results);
  writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);

  const keep = referencedSources(next);
  let removed = 0;
  for (const key of keys) {
    const dir = path.join(publicRoot, AUDIO_ROOT.slice(1), key);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const src = "/" + path.relative(publicRoot, path.join(entry.parentPath, entry.name)).split(path.sep).join("/");
      if (!keep.has(src)) {
        rmSync(path.join(entry.parentPath, entry.name));
        removed += 1;
      }
    }
  }
  const seconds = results.reduce((n, r) => n + r.durationSeconds, 0);
  console.log(`\n  rendered ${done}, kept ${results.length - done}, removed ${removed} superseded file(s)`);
  console.log(`  total narration for these subchapters: ${(seconds / 60).toFixed(1)} min`);
  console.log(`  manifest: ${path.relative(root, manifestPath)}\n`);
}

main().catch((error) => {
  console.error(`\ntraining:narrate failed — ${error.message}\n`);
  process.exit(1);
});
