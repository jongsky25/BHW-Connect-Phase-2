#!/usr/bin/env node
// One-time promotion of the Chapter 2.3 `hand-hygiene` handrub-steps clip.
//
// chapter2-lessons-release.mjs deliberately strips any asset that is not
// already live (see its own comment) — new media never reaches learners
// through that script, by design, until it clears review. This script is
// the explicit, named exception for that one asset, run once the owner
// confirmed the package's outstanding blocking_reviews are complete:
// qualified IPC/clinical review, independent Filipino/English review, a
// BHW/facilitator usability pilot, and browser QA (`review.json`,
// `blocking_reviews`), in addition to the clip's own visual approval
// already recorded there (`asset_visual_approvals` on `hand-hygiene`,
// 25 Sep 2026).
//
// The draft source file keeps `review_status: "draft"` for this asset —
// chapter2-validate.mjs enforces that for every asset in this
// still-authoring package, and that stays true here. Only the *release
// snapshot* built by this script marks it approved, the same convention
// used for the rest of Chapter 2's 25 Sep 2026 publication (see
// `release/los-banos-2026-09-25.json`'s `method` field).
//
//   node scripts/chapter2-promote-handrub-clip.mjs --project <ref>            # dry run
//   node scripts/chapter2-promote-handrub-clip.mjs --project <ref> --apply

import { readFileSync } from "node:fs";
import { contentHash, validateReferenceLesson } from "./lib/reference-content.mjs";
import { releaseManifestPath } from "./lib/chapter2-module-guide.mjs";
import { loadDraftModule } from "./chapter2-lessons-release.mjs";
import { createClient, projectUrl, requireEnv, signIn } from "./lib/supabase-rest.mjs";

const MODULE_KEY = "03-infection-control";
const LESSON_KEY = "hand-hygiene";
const ASSET_ID = "handrub-steps";
const json = (file) => JSON.parse(readFileSync(file, "utf8"));

function parseArgs(argv) {
  const args = { project: null, apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--project") args.project = argv[++i];
    else throw new Error(`unknown argument ${a}`);
  }
  if (!args.project) throw new Error("usage: --project <ref> [--apply]");
  return args;
}

async function fetchLive(client, moduleId) {
  const lessons = await client.get(`course_lessons?select=*&module_id=eq.${moduleId}`);
  const revisions = await client.get(
    `course_lesson_revisions?select=*&lesson_id=in.(${lessons.map((l) => l.id).join(",")})`,
  );
  const notes = revisions.length
    ? await client.get(
        `course_lesson_facilitator_notes?select=*&revision_id=in.(${revisions.map((r) => r.id).join(",")})`,
      )
    : [];
  return {
    lessons,
    revisions: Object.fromEntries(revisions.map((r) => [r.id, r])),
    notes: Object.fromEntries(notes.map((n) => [n.revision_id, n])),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = json(releaseManifestPath);
  if (manifest.project_id !== args.project)
    throw new Error(`release manifest is for ${manifest.project_id}, not ${args.project}`);

  const mod = loadDraftModule(MODULE_KEY);
  const draftLesson = mod.lessons.find((l) => l.manifest.lesson_key === LESSON_KEY);
  if (!draftLesson) throw new Error(`${LESSON_KEY} not found in ${MODULE_KEY} draft`);
  const draftAsset = draftLesson.revision.assets.find((a) => a.id === ASSET_ID);
  if (!draftAsset) throw new Error(`${ASSET_ID}: not found on the draft lesson`);
  if (draftAsset.review_status !== "draft")
    throw new Error(`${ASSET_ID}: expected draft in source; only this run's release snapshot approves it`);

  const url = projectUrl(args.project);
  const anonKey = process.env.KB_LOADER_ANON_KEY ?? requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const username = requireEnv("KB_LOADER_USERNAME", "an admin account on the target project");
  const client = createClient(url, anonKey, await signIn(url, anonKey, username, requireEnv("KB_LOADER_PASSWORD")));
  const [author] = await client.get(`users?select=id,role&username=eq.${encodeURIComponent(username)}`);
  if (author?.role !== "admin") throw new Error(`${username} is not an admin`);

  const moduleId = manifest.module_ids[MODULE_KEY];
  const [moduleRow] = await client.get(`course_modules?select=id,course_id&id=eq.${moduleId}`);
  if (!moduleRow || moduleRow.course_id !== manifest.course_id) throw new Error(`${MODULE_KEY}: reconcile module identity`);
  const live = await fetchLive(client, moduleId);

  const row = live.lessons.find((l) => l.lesson_key === LESSON_KEY);
  if (!row) throw new Error(`${LESSON_KEY}: no live lesson row`);
  const published = live.revisions[row.published_revision_id];
  const publishedNotes = live.notes[row.published_revision_id];
  if (!published || !publishedNotes) throw new Error(`${LESSON_KEY}: no published revision with notes`);
  if (published.assets.some((a) => a.id === ASSET_ID)) {
    console.log(`${LESSON_KEY}: ${ASSET_ID} is already live. Nothing to do.`);
    return;
  }

  // Same shape chapter2-lessons-release.mjs's releasableRevision() keeps —
  // draft assets/asset_ids filtered to what's allowed to go live — plus the
  // one asset this run explicitly approves.
  const keepIds = new Set([...published.assets.map((a) => a.id), ASSET_ID]);
  const revision = structuredClone(draftLesson.revision);
  revision.assets = revision.assets.filter((a) => keepIds.has(a.id)).map((a) => {
    if (a.id === ASSET_ID) return { ...a, review_status: "approved" };
    const live_a = published.assets.find((x) => x.id === a.id);
    return { ...a, review_status: live_a.review_status };
  });
  for (const s of revision.read_sections) s.asset_ids = (s.asset_ids ?? []).filter((id) => keepIds.has(id));
  for (const s of revision.slides) s.asset_ids = (s.asset_ids ?? []).filter((id) => keepIds.has(id));

  const lf = (s) => s.replace(/\r\n/g, "\n");
  const notes = {
    observation_indicators: draftLesson.notes.observation_indicators,
    notes_fil: lf(draftLesson.notes.notes_fil),
    notes_en: lf(draftLesson.notes.notes_en),
  };
  const lesson = { manifest: draftLesson.manifest, revision, notes };
  validateReferenceLesson(lesson);
  const hash = contentHash(lesson);

  if (hash === published.content_hash) {
    console.log(`${LESSON_KEY}: computed hash matches the live revision already. Nothing to do.`);
    return;
  }

  console.log(`${LESSON_KEY}: will create a new revision adding "${ASSET_ID}" (approved), hash ${hash}.`);
  console.log(`${MODULE_KEY}: will publish all ${live.lessons.length} lessons (6 unchanged, 1 new) via rpc_course_lessons_publish.`);

  if (!args.apply) {
    console.log("Dry run: no writes. Pass --apply to publish.");
    return;
  }

  const [newRevision] = await client.insert("course_lesson_revisions", [
    { lesson_id: row.id, revision_key: hash, content_hash: hash, ...revision, created_by: author.id },
  ]);
  await client.insert("course_lesson_facilitator_notes", [{ revision_id: newRevision.id, ...notes }]);

  const revisionIds = live.lessons.map((l) => (l.lesson_key === LESSON_KEY ? newRevision.id : l.published_revision_id));
  await client.rpc("rpc_course_lessons_publish", { p_module_id: moduleId, p_revision_ids: revisionIds });
  console.log(`${MODULE_KEY}: published. ${LESSON_KEY} now serves revision ${newRevision.id}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
