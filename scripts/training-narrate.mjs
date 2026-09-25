#!/usr/bin/env node
// Pre-renders Read-mode narration for converted Reference Manual lessons
// (Chapter 1 subchapters and the Chapter 2 package; see
// scripts/lib/narration-sources.mjs) and commits it as static files
// (public/training/audio/...) plus one manifest
// (content/training/day1-basic-competencies/narration.json). Nothing is
// written to Supabase and lesson revisions are untouched: the lesson page
// reads the manifest and shows a player only when the recorded sentence
// text still matches the published revision's text exactly.
//
//   npm run training:narrate                          # dry run, every converted subchapter
//   npm run training:narrate -- --modules 02-uhc-act  # dry run, one subchapter
//   npm run training:narrate -- --modules chapter2/04-first-aid
//   npm run training:narrate -- --apply               # render missing/stale audio
//   npm run training:narrate -- --chapter 1 --provider gemini --apply
//   npm run training:narrate -- --modules 01-tungkulin-ng-bhw --lessons bhw-roles-hepo --languages fil --provider gemini --apply
//
// Providers (--provider edge|gemini):
//   edge   — fil-PH-BlessicaNeural (Filipino), en-PH-RosaNeural (Philippine
//            English), via the Edge Read Aloud service (no key; honours
//            HTTPS_PROXY).
//   gemini — gemini-3.8-flash-tts, voice Kore, 32 kbps mono. Needs
//            GEMINI_API_KEY. One request per sentence; --max-requests
//            (default 1200, the daily ceiling in
//            docs/free-ai-leverage-plan.md §2) stops the run early and the
//            next run resumes.
// Without --provider, each section keeps the provider its audio already
// uses (new sections get edge), so a re-run after a text edit never swaps a
// re-voiced chapter back to the other voice.
//
// Unchanged sections are skipped by content hash, so re-runs only render
// edited text. A section that is not rendered (budget reached, or a request
// failed) keeps its previous audio. --apply also deletes audio files of the
// processed subchapters that the new manifest no longer references (git
// history keeps them).

import { existsSync, readdirSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NARRATION_MANIFEST, narratedModules } from "./lib/narration-sources.mjs";
import { loadReferenceModule } from "./lib/reference-content.mjs";
import {
  AUDIO_ROOT,
  buildManifest,
  planReferenceNarration,
  referencedSources,
  renderNarration,
  sha256,
} from "./lib/reference-narration.mjs";
import { synthesizeUtterance } from "./lib/tts-providers/edge-read-aloud.mjs";
import { synthesizeWithGemini } from "./lib/tts-providers/gemini.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");
const manifestPath = path.join(root, NARRATION_MANIFEST);

function parseArgs(argv) {
  const args = { apply: false, modules: null, chapter: null, lessons: null, languages: null, provider: null, maxRequests: 1200, concurrency: 3 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg === "--modules") args.modules = argv[++i].split(",").map((m) => m.trim());
    else if (arg === "--chapter") args.chapter = argv[++i];
    else if (arg === "--lessons") args.lessons = argv[++i].split(",").map((m) => m.trim());
    else if (arg === "--languages") args.languages = argv[++i].split(",").map((m) => m.trim());
    else if (arg === "--provider") args.provider = argv[++i];
    else if (arg === "--max-requests") args.maxRequests = Math.max(0, Number(argv[++i]) || 0);
    else if (arg === "--concurrency") args.concurrency = Math.max(1, Number(argv[++i]) || 1);
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (args.provider && !["edge", "gemini"].includes(args.provider)) throw new Error("--provider must be edge or gemini");
  if (args.chapter && !["1", "2"].includes(args.chapter)) throw new Error("--chapter must be 1 or 2");
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

// Chapter II subchapters are keyed "chapter2/..."; Chapter I keys have no prefix.
const inChapter = (key, chapter) => !chapter || (chapter === "2") === key.startsWith("chapter2/");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const converted = new Map(narratedModules(root).map((m) => [m.key, m.dir]));
  const keys = (args.modules ?? [...converted.keys()]).filter((key) => inChapter(key, args.chapter));
  for (const key of keys) {
    if (!converted.has(key)) throw new Error(`${key} is not a converted subchapter (no lessons/ folder)`);
  }
  const modules = keys.map((key) => ({ key, lessons: loadReferenceModule(path.join(root, converted.get(key)), publicRoot).lessons }));
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { lessons: {} };
  const items = planReferenceNarration(modules, manifest, fileHash, { provider: args.provider ?? undefined });
  // --lessons / --languages narrow what is rendered; everything else in the
  // processed subchapters keeps its current audio.
  const selected = (i) => (!args.lessons || args.lessons.includes(i.lessonKey)) && (!args.languages || args.languages.includes(i.language));
  const toRender = items.filter((i) => i.action === "render" && selected(i));
  const geminiRequests = toRender.filter((i) => i.provider === "gemini").reduce((n, i) => n + i.zones.length, 0);

  console.log(`\n${args.apply ? "APPLY" : "DRY RUN"} — ${keys.join(", ")}`);
  console.log(`  provider: ${args.provider ?? "keep each section's current provider (new: edge)"}`);
  console.log(`  sections × languages: ${items.length} (render ${toRender.length}, unchanged or not selected ${items.length - toRender.length})`);
  console.log(`  characters to synthesize: ${toRender.reduce((n, i) => n + i.charCount, 0)}`);
  if (geminiRequests) console.log(`  Gemini requests: ${geminiRequests} (this run stops at ${args.maxRequests}; re-runs resume)`);
  if (!args.apply) {
    console.log("\n  nothing was written — re-run with --apply\n");
    return;
  }
  if (geminiRequests && !process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");

  const results = [];
  let done = 0;
  let requests = 0;
  let deferred = 0;
  let failure = null;
  // A section that is not rendered keeps the audio it already has, if any.
  const keepPrevious = (item) => {
    const prev = item.previous;
    if (prev && fileHash(prev.src) === prev.sha256)
      results.push({ ...item, src: prev.src, voice: prev.voice, contentHash: prev.content_hash, sha256: prev.sha256, durationSeconds: prev.duration_seconds, timings: prev.timings });
  };
  await pool(items, args.concurrency, async (item) => {
    if (item.action === "skip") {
      results.push({ ...item, sha256: item.existing.sha256, durationSeconds: item.existing.duration_seconds, timings: item.existing.timings });
      return;
    }
    if (!selected(item)) return keepPrevious(item);
    const cost = item.provider === "gemini" ? item.zones.length : 0;
    if (failure || requests + cost > args.maxRequests) {
      deferred += 1;
      return keepPrevious(item);
    }
    requests += cost;
    let audio;
    try {
      audio = await renderNarration(item, { synthesizeUtterance, synthesizeWithGemini, geminiApiKey: process.env.GEMINI_API_KEY });
    } catch (error) {
      failure ??= error;
      console.error(`  ✗ ${item.lessonKey} ${item.sectionId} (${item.language}): ${error.message}`);
      deferred += 1;
      return keepPrevious(item);
    }
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
  if (requests) console.log(`  Gemini requests used: ${requests}`);
  if (deferred) console.log(`  not rendered this run: ${deferred} (kept previous audio where it existed) — re-run to resume`);
  console.log(`  total narration for these subchapters: ${(seconds / 60).toFixed(1)} min`);
  console.log(`  manifest: ${path.relative(root, manifestPath)}\n`);
  if (failure) throw failure;
}

main().catch((error) => {
  console.error(`\ntraining:narrate failed — ${error.message}\n`);
  process.exit(1);
});
