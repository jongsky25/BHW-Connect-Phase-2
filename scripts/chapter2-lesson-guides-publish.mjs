#!/usr/bin/env node
// Republishes Chapter 2 lessons with rewritten private facilitator notes and
// nothing else. The learner content of each new revision (read sections,
// slides, coverage, sources, assets) is copied from the lesson's CURRENTLY
// PUBLISHED revision in the database, never from the draft files: the drafts
// carry changes that are deliberately not live yet (e.g. the 2.3 handrub clip,
// held until its review). Only facilitator.{fil,en}.md come from the drafts.
//
// Revisions are immutable and the notes are part of the content hash, so a
// changed guide is a new revision; the whole subchapter is then promoted
// through rpc_course_lessons_publish (it requires every lesson of the module).
// Lesson completion is keyed by lesson, so BHW progress is unaffected.
//
//   node scripts/chapter2-lesson-guides-publish.mjs --check                   # validate drafts only
//   node scripts/chapter2-lesson-guides-publish.mjs --project <ref>           # dry run
//   node scripts/chapter2-lesson-guides-publish.mjs --project <ref> --apply   # write + publish
//   ... --modules 01-difficult-situations,04-first-aid
//
// Env for --project: KB_LOADER_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY),
// KB_LOADER_USERNAME, KB_LOADER_PASSWORD — an admin on that project.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { canonical, contentHash, loadReferenceModule, validateReferenceLesson } from './lib/reference-content.mjs';
import { CHAPTER2_MODULES, chapter2Root, releaseManifestPath } from './lib/chapter2-module-guide.mjs';
import { validateDraftModule } from './chapter2-validate.mjs';
import { createClient, projectUrl, requireEnv, signIn } from './lib/supabase-rest.mjs';

const publicRoot = path.resolve(chapter2Root, '../../../public');
const LEARNER_FIELDS = ['read_sections', 'slides', 'coverage', 'sources', 'assets'];
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));

// Published notes were stored with CRLF line endings; compare text, not bytes.
const normalizeNotes = (n) => ({
  observation_indicators: n.observation_indicators,
  notes_fil: n.notes_fil.replace(/\r\n/g, '\n'),
  notes_en: n.notes_en.replace(/\r\n/g, '\n'),
});

export function loadDraftGuides(moduleKey, root = chapter2Root) {
  const dir = path.join(root, 'drafts', moduleKey);
  const mod = loadReferenceModule(dir, publicRoot);
  validateDraftModule(mod, dir, json(path.join(dir, 'review.json')), json(path.join(dir, 'activities.json')).activities);
  return mod;
}

// Pure planning step: given the draft module and the live rows, decide per
// lesson whether its published revision already carries these notes, and if
// not, build the replacement revision from the live learner content.
export function planModule(mod, live) {
  const draftKeys = mod.lessons.map((l) => l.manifest.lesson_key).sort();
  const liveKeys = live.lessons.map((l) => l.lesson_key).sort();
  if (canonical(draftKeys) !== canonical(liveKeys)) throw new Error(`${mod.module_key}: live lessons differ from the draft package`);
  const entries = mod.lessons.map((draft) => {
    const row = live.lessons.find((l) => l.lesson_key === draft.manifest.lesson_key);
    const key = `${mod.module_key}/${row.lesson_key}`;
    for (const k of Object.keys(draft.manifest)) {
      if (canonical(row[k]) !== canonical(draft.manifest[k])) throw new Error(`${key}: lesson metadata ${k} differs from live; reconcile first`);
    }
    const published = live.revisions[row.published_revision_id];
    const publishedNotes = live.notes[row.published_revision_id];
    if (!published || !publishedNotes) throw new Error(`${key}: no published revision with notes`);
    const notes = normalizeNotes(draft.notes);
    if (canonical(normalizeNotes(publishedNotes)) === canonical(notes)) {
      return { key, lessonId: row.id, action: 'unchanged', revisionId: published.id };
    }
    const lesson = {
      manifest: draft.manifest,
      revision: Object.fromEntries(LEARNER_FIELDS.map((f) => [f, published[f]])),
      notes,
    };
    validateReferenceLesson(lesson);
    const hash = contentHash(lesson);
    const existing = live.byHash[`${row.id}:${hash}`];
    return { key, lessonId: row.id, action: existing ? 'reuse' : 'create', hash, lesson, revisionId: existing?.id ?? null, from: published.id };
  });
  return { module_key: mod.module_key, entries, publish: entries.some((e) => e.action !== 'unchanged') };
}

async function fetchLive(client, moduleId) {
  const lessons = await client.get(`course_lessons?select=*&module_id=eq.${moduleId}`);
  const ids = lessons.map((l) => l.id).join(',');
  const revisions = await client.get(`course_lesson_revisions?select=*&lesson_id=in.(${ids})`);
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
  const modules = args.modules.map((key) => loadDraftGuides(key));
  console.log(`Draft guides valid: ${modules.reduce((n, m) => n + m.lessons.length, 0)} lessons in ${modules.length} subchapter(s).`);
  if (!args.project) return;

  const manifest = json(releaseManifestPath);
  if (manifest.project_id !== args.project) throw new Error(`release manifest is for ${manifest.project_id}, not ${args.project}`);
  const url = projectUrl(args.project);
  const anonKey = process.env.KB_LOADER_ANON_KEY ?? requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const username = requireEnv('KB_LOADER_USERNAME', 'an admin account on the target project');
  const client = createClient(url, anonKey, await signIn(url, anonKey, username, requireEnv('KB_LOADER_PASSWORD')));
  const [author] = await client.get(`users?select=id,role&username=eq.${encodeURIComponent(username)}`);
  if (author?.role !== 'admin') throw new Error(`${username} is not an admin`);

  // Plan every selected subchapter before the first write.
  const plans = [];
  for (const mod of modules) {
    const moduleId = manifest.module_ids[mod.module_key];
    const [row] = await client.get(`course_modules?select=id,course_id&id=eq.${moduleId}`);
    if (!row || row.course_id !== manifest.course_id) throw new Error(`${mod.module_key}: reconcile module identity`);
    plans.push({ moduleId, ...planModule(mod, await fetchLive(client, moduleId)) });
  }
  for (const p of plans) {
    const count = (a) => p.entries.filter((e) => e.action === a).length;
    console.log(`${p.module_key}: create ${count('create')}, reuse ${count('reuse')}, unchanged ${count('unchanged')}${p.publish ? ' → publish subchapter' : ''}`);
  }
  if (!args.apply) {
    console.log('Dry run: no writes. Learner content is copied from each live revision; only facilitator notes change.');
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
    const order = p.entries.map((e) => e.revisionId);
    await client.rpc('rpc_course_lessons_publish', { p_module_id: p.moduleId, p_revision_ids: order });
    console.log(`${p.module_key}: published ${order.length} lesson revisions.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
