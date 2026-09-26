#!/usr/bin/env node
// Releases edited Chapter 2 learner content (and the matching private notes)
// from the draft package. Unlike chapter2-lesson-guides-publish.mjs, which
// changes notes only, each new revision here is built from the drafts:
// read sections, slides, coverage, sources and notes.
//
// Assets are the one exception. A draft may reference media that is not
// approved for production yet (e.g. the 2.3 handrub clip); only assets that
// the lesson's live published revision already carries are released, with
// their live review_status, and references to any other asset are dropped.
// New media therefore never reaches learners through this script.
//
// Lesson metadata (titles, objectives, position, requiredness) must equal the
// live rows. The whole subchapter is promoted via rpc_course_lessons_publish;
// completion is keyed by lesson, so BHW progress is unaffected.
//
//   node scripts/chapter2-lessons-release.mjs --check
//   node scripts/chapter2-lessons-release.mjs --project <ref>            # dry run with a per-lesson field diff
//   node scripts/chapter2-lessons-release.mjs --project <ref> --apply
//   ... --modules 04-first-aid,05-medicinal-plants

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { canonical, contentHash, loadReferenceModule, validateReferenceLesson } from './lib/reference-content.mjs';
import { CHAPTER2_MODULES, chapter2Root, releaseManifestPath } from './lib/chapter2-module-guide.mjs';
import { validateDraftModule } from './chapter2-validate.mjs';
import { createClient, projectUrl, requireEnv, signIn } from './lib/supabase-rest.mjs';

const publicRoot = path.resolve(chapter2Root, '../../../public');
const REVISION_FIELDS = ['read_sections', 'slides', 'coverage', 'sources', 'assets', 'featured_asset_id'];
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const lf = (s) => s.replace(/\r\n/g, '\n');
const notesOf = (n) => ({ observation_indicators: n.observation_indicators, notes_fil: lf(n.notes_fil), notes_en: lf(n.notes_en) });

export function loadDraftModule(moduleKey, root = chapter2Root) {
  const dir = path.join(root, 'drafts', moduleKey);
  const mod = loadReferenceModule(dir, publicRoot);
  validateDraftModule(mod, dir, json(path.join(dir, 'review.json')), json(path.join(dir, 'activities.json')).activities);
  return mod;
}

// Keep only media already live for this lesson; strip references to the rest.
export function releasableRevision(draftRevision, liveAssets) {
  const live = new Map(liveAssets.map((a) => [a.id, a]));
  const keep = (ids) => (ids ?? []).filter((id) => live.has(id));
  const revision = structuredClone(draftRevision);
  revision.assets = revision.assets.filter((a) => live.has(a.id)).map((a) => {
    const l = live.get(a.id);
    const { video, videos, ...rest } = a;
    const released = { ...rest, review_status: l.review_status };
    // Clip media rides along only on an asset already live as a clip.
    if (!(l.video || l.videos)) return released;
    return { ...released, ...(video ? { video } : {}), ...(videos ? { videos } : {}) };
  });
  for (const s of revision.read_sections) s.asset_ids = keep(s.asset_ids);
  for (const s of revision.slides) s.asset_ids = keep(s.asset_ids);
  if (revision.featured_asset_id && !live.has(revision.featured_asset_id)) revision.featured_asset_id = null;
  return revision;
}

export function planRelease(mod, live) {
  const draftKeys = mod.lessons.map((l) => l.manifest.lesson_key).sort();
  if (canonical(draftKeys) !== canonical(live.lessons.map((l) => l.lesson_key).sort())) {
    throw new Error(`${mod.module_key}: live lessons differ from the draft package`);
  }
  const entries = mod.lessons.map((draft) => {
    const row = live.lessons.find((l) => l.lesson_key === draft.manifest.lesson_key);
    const key = `${mod.module_key}/${row.lesson_key}`;
    for (const k of Object.keys(draft.manifest)) {
      if (canonical(row[k]) !== canonical(draft.manifest[k])) throw new Error(`${key}: lesson metadata ${k} differs from live; reconcile first`);
    }
    const published = live.revisions[row.published_revision_id];
    const publishedNotes = live.notes[row.published_revision_id];
    if (!published || !publishedNotes) throw new Error(`${key}: no published revision with notes`);
    const revision = releasableRevision(draft.revision, published.assets);
    const lesson = { manifest: draft.manifest, revision, notes: notesOf(draft.notes) };
    const changed = [
      ...REVISION_FIELDS.filter((f) => canonical(published[f]) !== canonical(revision[f])),
      ...['notes_fil', 'notes_en', 'observation_indicators'].filter((f) => canonical(notesOf(publishedNotes)[f]) !== canonical(lesson.notes[f])),
    ];
    if (!changed.length) return { key, lessonId: row.id, action: 'unchanged', revisionId: published.id, changed };
    validateReferenceLesson(lesson);
    const hash = contentHash(lesson);
    const existing = live.byHash[`${row.id}:${hash}`];
    return { key, lessonId: row.id, action: existing ? 'reuse' : 'create', hash, lesson, changed, revisionId: existing?.id ?? null, from: published.id };
  });
  return { module_key: mod.module_key, entries, publish: entries.some((e) => e.action !== 'unchanged') };
}

async function fetchLive(client, moduleId) {
  const lessons = await client.get(`course_lessons?select=*&module_id=eq.${moduleId}`);
  const revisions = await client.get(`course_lesson_revisions?select=*&lesson_id=in.(${lessons.map((l) => l.id).join(',')})`);
  const notes = revisions.length ? await client.get(`course_lesson_facilitator_notes?select=*&revision_id=in.(${revisions.map((r) => r.id).join(',')})`) : [];
  return {
    lessons,
    revisions: Object.fromEntries(revisions.map((r) => [r.id, r])),
    notes: Object.fromEntries(notes.map((n) => [n.revision_id, n])),
    byHash: Object.fromEntries(revisions.map((r) => [`${r.lesson_id}:${r.content_hash}`, r])),
  };
}

function parseArgs(argv) {
  const args = { project: null, apply: false, check: false, modules: CHAPTER2_MODULES };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--check') args.check = true;
    else if (a === '--project') args.project = argv[++i];
    else if (a === '--modules') args.modules = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else throw new Error(`unknown argument ${a}`);
  }
  const unknown = args.modules.filter((m) => !CHAPTER2_MODULES.includes(m));
  if (unknown.length) throw new Error(`unknown Chapter 2 module(s): ${unknown.join(', ')}`);
  if (args.apply && !args.project) throw new Error('--apply requires --project');
  if (!args.project && !args.check) throw new Error('use --check or --project <ref>');
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const modules = args.modules.map((key) => loadDraftModule(key));
  console.log(`Drafts valid: ${modules.reduce((n, m) => n + m.lessons.length, 0)} lessons in ${modules.length} subchapter(s).`);
  if (!args.project) return;

  const manifest = json(releaseManifestPath);
  if (manifest.project_id !== args.project) throw new Error(`release manifest is for ${manifest.project_id}, not ${args.project}`);
  const url = projectUrl(args.project);
  const anonKey = process.env.KB_LOADER_ANON_KEY ?? requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const username = requireEnv('KB_LOADER_USERNAME', 'an admin account on the target project');
  const client = createClient(url, anonKey, await signIn(url, anonKey, username, requireEnv('KB_LOADER_PASSWORD')));
  const [author] = await client.get(`users?select=id,role&username=eq.${encodeURIComponent(username)}`);
  if (author?.role !== 'admin') throw new Error(`${username} is not an admin`);

  const plans = [];
  for (const mod of modules) {
    const moduleId = manifest.module_ids[mod.module_key];
    const [row] = await client.get(`course_modules?select=id,course_id&id=eq.${moduleId}`);
    if (!row || row.course_id !== manifest.course_id) throw new Error(`${mod.module_key}: reconcile module identity`);
    plans.push({ moduleId, ...planRelease(mod, await fetchLive(client, moduleId)) });
  }
  for (const p of plans) {
    const count = (a) => p.entries.filter((e) => e.action === a).length;
    console.log(`${p.module_key}: create ${count('create')}, reuse ${count('reuse')}, unchanged ${count('unchanged')}${p.publish ? ' → publish subchapter' : ''}`);
    for (const e of p.entries.filter((x) => x.action !== 'unchanged')) console.log(`  ${e.key}: ${e.changed.join(', ')}`);
  }
  if (!args.apply) {
    console.log('Dry run: no writes. Only media already live for each lesson is released.');
    return;
  }
  for (const p of plans) {
    if (!p.publish) continue;
    for (const e of p.entries.filter((x) => x.action === 'create')) {
      const [revision] = await client.insert('course_lesson_revisions', [{
        lesson_id: e.lessonId, revision_key: e.hash, content_hash: e.hash, ...e.lesson.revision, created_by: author.id,
      }]);
      await client.insert('course_lesson_facilitator_notes', [{ revision_id: revision.id, ...e.lesson.notes }]);
      e.revisionId = revision.id;
    }
    for (const e of p.entries.filter((x) => x.action === 'reuse')) {
      const [notes] = await client.get(`course_lesson_facilitator_notes?select=revision_id&revision_id=eq.${e.revisionId}`);
      if (!notes) await client.insert('course_lesson_facilitator_notes', [{ revision_id: e.revisionId, ...e.lesson.notes }]);
    }
    await client.rpc('rpc_course_lessons_publish', { p_module_id: p.moduleId, p_revision_ids: p.entries.map((e) => e.revisionId) });
    console.log(`${p.module_key}: published ${p.entries.length} lesson revisions.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
