#!/usr/bin/env node
// INC-27 (docs/training-modules-plan.md): pre-renders sentence-level audio
// narration for a content/training/<course>/ tree's lesson sections and
// writes it to course_module_audio + the training-audio storage bucket. A
// sibling of training-load.mjs, reusing its --project/--dry-run/--apply
// discipline and its locks/<ref>.json content-id -> row-uuid mechanism —
// this script only ever ADDS to that lock file's existing module mapping,
// never writes it, since training-load.mjs owns creating/updating
// course_modules rows and this script only attaches audio to rows that
// already exist (running this before training:load for a new module is a
// no-op "module-not-loaded" outcome per section, not an error).
//
// Content is static, so narration is generated here, once, ahead of time —
// never at runtime. Putting a TTS API call on the critical path of a page
// a BHW opens on mobile data would be the wrong trade for content that
// changes a few times a year (see docs/training-modules-plan.md's INC-27
// section for the full reasoning).
//
//   npm run training:tts -- --project <ref> --course day1-basic-competencies
//   npm run training:tts -- --project <ref> --apply
//   npm run training:tts -- --project <ref> --modules 01-tungkulin-ng-bhw --apply
//
// Env: KB_LOADER_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY), KB_LOADER_USERNAME,
//      KB_LOADER_PASSWORD — same admin account training-load.mjs uses (this
//      script writes course_module_audio directly through PostgREST under
//      that admin token's own admin-write RLS policy, the same "no RPC
//      covers this loader-managed table" situation as course_module_visuals
//      — see training-load.mjs's own header comment for the pattern).
//      AZURE_SPEECH_KEY / AZURE_SPEECH_REGION — optional; when absent, every
//      section renders via the free edge-tts fallback instead (see
//      scripts/lib/tts-providers/edge-tts.mjs's header for that provider's
//      own caveats).
//      GEMINI_API_KEY — only with --provider gemini, which renders every
//      section via Gemini TTS and never falls back (a module narrated in two
//      different voices would be worse than a stopped run; re-running
//      resumes, since finished sections are skipped).
//
//   npm run training:tts -- --provider gemini --sample sample.mp3
//      renders the first Filipino section to a local file only (no Supabase
//      access, no --project needed) so the voice can be checked first.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_COURSE, loadTrainingCourse } from "./lib/training-content.mjs";
import { createClient, projectUrl, requireEnv, signIn, uploadStorageObject } from "./lib/supabase-rest.mjs";
import { synthesizeWithAzure } from "./lib/tts-providers/azure.mjs";
import { synthesizeWithEdgeTts } from "./lib/tts-providers/edge-tts.mjs";
import { geminiVoiceId, synthesizeWithGemini } from "./lib/tts-providers/gemini.mjs";
import {
  buildRenderPlan,
  createProviderChain,
  estimateCharBudget,
  renderItem,
  summarizePlan,
} from "./lib/tts-render-core.mjs";

// Azure's Standard (free-tier-eligible) neural voice allowance, per
// docs/training-modules-plan.md's locked decision. Checked against the
// estimate before spending a single real character.
const AZURE_FREE_TIER_CHARS_PER_MONTH = 500_000;

function parseArgs(argv) {
  const args = { project: null, apply: false, course: DEFAULT_COURSE, modules: null, provider: "auto", sample: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg === "--project") args.project = argv[++i];
    else if (arg === "--course") args.course = argv[++i];
    else if (arg === "--modules") args.modules = argv[++i].split(",").map((m) => m.trim());
    else if (arg === "--provider") args.provider = argv[++i];
    else if (arg === "--sample") args.sample = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!["auto", "gemini"].includes(args.provider)) throw new Error(`--provider must be auto or gemini, got ${args.provider}`);
  if (args.sample && args.provider !== "gemini") throw new Error("--sample is only supported with --provider gemini");
  if (!args.project && !args.sample) throw new Error("--project <supabase-project-ref> is required");
  return args;
}

function contentDir(course) {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "content", "training", course);
}

// Reads the SAME lock file training-load.mjs writes — this script only
// reads the module content-id -> row-uuid mapping from it, never writes
// that mapping itself (training-load.mjs owns course/module rows; this
// script only attaches audio to a module row that already exists there).
function readModuleRowIds(course, ref) {
  const file = path.join(contentDir(course), "locks", `${ref}.json`);
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, "utf8")).modules ?? {};
}

async function fetchExistingAudio(client, moduleRowIds) {
  const rowIdToContentId = new Map(Object.entries(moduleRowIds).map(([contentId, rowId]) => [rowId, contentId]));
  const rowIds = [...rowIdToContentId.keys()];
  if (rowIds.length === 0) return new Map();

  const rows = await client.get(
    `course_module_audio?select=id,module_id,section_index,language,content_hash&module_id=in.(${rowIds.join(",")})`,
  );

  const byKey = new Map();
  for (const row of rows) {
    const contentId = rowIdToContentId.get(row.module_id);
    byKey.set(`${contentId}:${row.section_index}:${row.language}`, { id: row.id, content_hash: row.content_hash });
  }
  return byKey;
}

const GEMINI_VOICES = { fil: geminiVoiceId(), en: geminiVoiceId() };

function synthesizeViaGemini(zones, language) {
  return synthesizeWithGemini(zones, language, { apiKey: requireEnv("GEMINI_API_KEY") });
}

async function writeSample(modules, file) {
  const [item] = buildRenderPlan(modules, new Map(), GEMINI_VOICES).filter((i) => i.language === "fil");
  if (!item) throw new Error("no Filipino section to sample in the selected modules");
  const result = await synthesizeViaGemini(item.zones, item.language);
  writeFileSync(file, result.audioBytes);
  console.log(`\n  wrote ${file} — ${item.moduleContentId} section ${item.sectionIndex} (fil), ${result.durationSeconds.toFixed(1)}s`);
  for (const t of result.timings) console.log(`    ${t.start_ms}-${t.end_ms}ms  ${t.zone}[${t.index}]  ${t.text.slice(0, 60)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const content = loadTrainingCourse(args.course);
  const modules = args.modules ? content.modules.filter((m) => args.modules.includes(m.id)) : content.modules;
  const useGemini = args.provider === "gemini";

  if (args.sample) {
    await writeSample(modules, args.sample);
    return;
  }

  const url = projectUrl(args.project);
  const anonKey = process.env.KB_LOADER_ANON_KEY ?? requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const token = await signIn(
    url,
    anonKey,
    requireEnv("KB_LOADER_USERNAME", "an admin account on the target project"),
    requireEnv("KB_LOADER_PASSWORD"),
  );
  const client = createClient(url, anonKey, token);

  const moduleRowIds = readModuleRowIds(args.course, args.project);
  const existingAudioByKey = await fetchExistingAudio(client, moduleRowIds);
  const items = buildRenderPlan(modules, existingAudioByKey, useGemini ? GEMINI_VOICES : undefined);
  const plannedBudget = estimateCharBudget(items);

  console.log(`\n${args.apply ? "APPLY" : "DRY RUN"} — project ${args.project}, course ${args.course}`);
  console.log(`  sections to render  ${JSON.stringify(summarizePlan(items))}`);
  if (useGemini) {
    const requests = items.filter((i) => i.action !== "skip").reduce((sum, i) => sum + i.zones.length, 0);
    console.log(`  provider  gemini — ${requests} requests (one per sentence), ${plannedBudget} chars`);
  } else {
    console.log(
      `  estimated chars (create+update, Azure-priced)  ${plannedBudget} / ${AZURE_FREE_TIER_CHARS_PER_MONTH} free-tier monthly allowance`,
    );
  }
  if (!useGemini && plannedBudget > AZURE_FREE_TIER_CHARS_PER_MONTH) {
    console.log("  ⚠ this run alone would exceed the Azure free tier — re-check content scope before --apply");
  }

  if (!args.apply) {
    console.log("\n  nothing was written — re-run with --apply\n");
    return;
  }

  if (useGemini) requireEnv("GEMINI_API_KEY", "a Gemini API key");
  const azureConfigured = Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
  if (!useGemini && !azureConfigured) {
    console.log("  AZURE_SPEECH_KEY/AZURE_SPEECH_REGION not set — every section will render via the edge-tts fallback");
  }

  const synthesize = useGemini ? synthesizeViaGemini : createProviderChain({
    synthesizeAzure: (zones, language) =>
      synthesizeWithAzure(zones, language, {
        key: process.env.AZURE_SPEECH_KEY,
        region: process.env.AZURE_SPEECH_REGION,
      }),
    synthesizeEdgeTts: (zones, language) => synthesizeWithEdgeTts(zones, language),
    azureConfigured,
    onFallback: (error) => console.log(`  Azure synthesis failed, falling back to edge-tts: ${error.message}`),
  });

  const deps = {
    synthesize,
    uploadAudio: (objectPath, bytes, format) =>
      uploadStorageObject(url, anonKey, token, "training-audio", objectPath, bytes, format === "opus" ? "audio/webm" : "audio/mpeg"),
    upsertAudioRow: async (row) => {
      const payload = {
        module_id: row.moduleId,
        section_index: row.sectionIndex,
        language: row.language,
        audio_url: row.audioUrl,
        format: row.format,
        duration_seconds: row.durationSeconds,
        content_hash: row.contentHash,
        timings: row.timings,
      };
      if (row.existingId) await client.patch(`course_module_audio?id=eq.${row.existingId}`, payload);
      else await client.insert("course_module_audio", [payload]);
    },
    resolveModuleRowId: async (moduleContentId) => moduleRowIds[moduleContentId] ?? null,
  };

  let azureChars = 0;
  let edgeTtsCount = 0;
  let geminiCount = 0;
  let notLoaded = 0;

  for (const item of items) {
    const result = await renderItem(item, deps);
    if (result.outcome === "module-not-loaded") {
      notLoaded += 1;
      console.log(`  ! ${item.moduleContentId} section ${item.sectionIndex} (${item.language}): module not loaded yet — run training:load first`);
      continue;
    }
    if (result.outcome === "skipped") continue;
    if (result.provider === "azure") azureChars += result.charCount ?? 0;
    else if (result.provider === "gemini") geminiCount += 1;
    else edgeTtsCount += 1;
    console.log(`  ✓ ${item.moduleContentId} section ${item.sectionIndex} (${item.language}) — ${result.outcome} via ${result.provider}`);
  }

  console.log(`\n  Azure characters spent this run: ${azureChars}`);
  console.log(`  sections rendered via edge-tts fallback: ${edgeTtsCount}`);
  if (geminiCount > 0) console.log(`  sections rendered via Gemini: ${geminiCount}`);
  if (notLoaded > 0) console.log(`  sections skipped, module not loaded: ${notLoaded}`);
}

main().catch((error) => {
  console.error(`\ntraining:tts failed — ${error.message}\n`);
  process.exit(1);
});
