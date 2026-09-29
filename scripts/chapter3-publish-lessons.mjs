#!/usr/bin/env node
// Publish the already-staged Chapter III revisions through the authenticated
// admin RPC. This changes lesson pointers only; the course remains draft and
// Chapter III remains unavailable. The owner attested review completion, with
// the signed review record to be attached separately.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, contentHash, loadReferenceModule } from './lib/reference-content.mjs';
import { createClient, projectUrl, requireEnv, signIn } from './lib/supabase-rest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = path.join(root, 'content/training/chapter3-core-competencies');
const blueprint = JSON.parse(readFileSync(path.join(packageRoot, 'chapter-blueprint.json'), 'utf8'));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseArgs(argv) {
  const result = { project: null, orgUnit: null, courseId: null, apply: false, check: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--project') result.project = argv[++i];
    else if (arg === '--org-unit') result.orgUnit = argv[++i];
    else if (arg === '--course-id') result.courseId = argv[++i];
    else if (arg === '--apply') result.apply = true;
    else if (arg === '--check') result.check = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (result.check) {
    if (result.project || result.orgUnit || result.courseId || result.apply) throw new Error('--check is offline only');
    return result;
  }
  if (!/^[a-z0-9]+$/.test(result.project ?? '') || !result.orgUnit || !uuid.test(result.courseId ?? '')) {
    throw new Error('Usage: node scripts/chapter3-publish-lessons.mjs --check | --project <ref> --org-unit <name> --course-id <uuid> [--apply]');
  }
  return result;
}

function sameFields(actual, expected) {
  return Object.keys(expected).every(key => canonical(actual[key]) === canonical(expected[key]));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.check) {
    const loaded = blueprint.modules.map(item => loadReferenceModule(path.join(packageRoot, 'drafts', item.module_key), path.join(root, 'public')));
    const lessons = loaded.flatMap(module => module.lessons);
    if (loaded.length !== 12 || lessons.length !== 65 || lessons.some(l => l.revision.assets.some(a => a.review_status !== 'approved'))) {
      throw new Error('Offline package does not meet the expected 12 modules, 65 lessons and approved assets');
    }
    console.log('Offline release package: 12 modules, 65 lessons, no unapproved assets. No project contacted.');
    return;
  }
  const url = projectUrl(args.project);
  const anonKey = process.env.KB_LOADER_ANON_KEY ?? requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const username = requireEnv('KB_LOADER_USERNAME');
  const token = await signIn(url, anonKey, username, requireEnv('KB_LOADER_PASSWORD'));
  const client = createClient(url, anonKey, token);
  const [actor] = await client.get(`users?select=id,role,status,org_unit_id&username=eq.${encodeURIComponent(username)}`);
  if (!actor || actor.role !== 'admin' || actor.status !== 'active') throw new Error('An active admin must publish the lessons');
  const orgs = await client.get(`org_units?select=id,name&name=eq.${encodeURIComponent(args.orgUnit)}`);
  if (orgs.length !== 1) throw new Error('Resolve the exact organization');
  const orgId = orgs[0].id;
  const programs = await client.get(`training_programs?select=id,org_unit_id&content_key=eq.bhw-reference-manual&org_unit_id=eq.${orgId}`);
  if (programs.length !== 1) throw new Error('Expected one BHW Reference Manual program');
  const chapters = await client.get(`training_program_chapters?select=id,course_id,availability&program_id=eq.${programs[0].id}&chapter_key=eq.chapter-3`);
  if (chapters.length !== 1 || chapters[0].availability !== 'unavailable' || chapters[0].course_id !== args.courseId) {
    throw new Error('Chapter III must remain unavailable and mapped to the selected course');
  }
  const [course] = await client.get(`courses?select=id,org_unit_id,status,title_fil,title_en&id=eq.${args.courseId}`);
  if (!course || course.org_unit_id !== orgId || course.status !== 'draft' ||
      course.title_fil !== blueprint.title_fil || course.title_en !== blueprint.title_en) {
    throw new Error('Selected course does not match the staged draft');
  }

  const modules = await client.get(`course_modules?select=*&course_id=eq.${args.courseId}&order=position`);
  if (modules.length !== blueprint.modules.length) throw new Error('Unexpected module count');
  const moduleIds = modules.map(m => m.id);
  const lessons = await client.get(`course_lessons?select=*&module_id=in.(${moduleIds.join(',')})`);
  if (lessons.length !== 65) throw new Error('Unexpected lesson count');
  const revisions = await client.get(`course_lesson_revisions?select=id,lesson_id,content_hash,assets&lesson_id=in.(${lessons.map(l => l.id).join(',')})`);
  const notes = await client.get(`course_lesson_facilitator_notes?select=revision_id&revision_id=in.(${revisions.map(r => r.id).join(',')})`);
  const noteIds = new Set(notes.map(n => n.revision_id));
  const plan = [];
  for (const [position, item] of blueprint.modules.entries()) {
    const expectedModule = JSON.parse(readFileSync(path.join(packageRoot, 'drafts', item.module_key, 'module.json'), 'utf8'));
    const module = modules[position];
    const { id: localKey, ...moduleFields } = expectedModule;
    if (localKey !== item.module_key || !module || !sameFields(module, moduleFields)) throw new Error(`${item.module_key}: staged module differs`);
    const authored = loadReferenceModule(path.join(packageRoot, 'drafts', item.module_key), path.join(root, 'public'));
    const live = lessons.filter(l => l.module_id === module.id);
    if (live.length !== authored.lessons.length) throw new Error(`${item.module_key}: lesson count differs`);
    const revisionIds = [];
    for (const lesson of authored.lessons) {
      const matches = live.filter(row => row.lesson_key === lesson.manifest.lesson_key);
      if (matches.length !== 1 || !sameFields(matches[0], lesson.manifest)) throw new Error(`${item.module_key}/${lesson.manifest.lesson_key}: lesson differs`);
      const row = matches[0];
      const hash = contentHash(lesson);
      const stored = revisions.filter(r => r.lesson_id === row.id && r.content_hash === hash);
      if (stored.length !== 1 || !noteIds.has(stored[0].id)) throw new Error(`${item.module_key}/${row.lesson_key}: revision or private notes missing`);
      if (stored[0].assets.some(asset => asset.review_status !== 'approved')) throw new Error(`${item.module_key}/${row.lesson_key}: unapproved asset`);
      if (row.published_revision_id && row.published_revision_id !== stored[0].id) throw new Error(`${item.module_key}/${row.lesson_key}: another revision is already published`);
      revisionIds.push(stored[0].id);
    }
    plan.push({ module: item.module_key, moduleId: module.id, revisionIds, alreadyPublished: live.every(l => l.published_revision_id) });
  }
  console.log(JSON.stringify({ project: args.project, courseId: args.courseId, action: args.apply ? 'publish' : 'dry-run',
    modules: plan.length, lessons: plan.reduce((n, p) => n + p.revisionIds.length, 0),
    alreadyPublishedModules: plan.filter(p => p.alreadyPublished).length,
    chapterAvailability: chapters[0].availability, courseStatus: course.status }, null, 2));
  if (!args.apply) return;
  for (const item of plan) {
    if (!item.alreadyPublished) {
      await client.rpc('rpc_course_lessons_publish', { p_module_id: item.moduleId, p_revision_ids: item.revisionIds });
      console.log(`${item.module}: published ${item.revisionIds.length} lessons`);
    }
  }
  const after = await client.get(`course_lessons?select=id,published_revision_id&module_id=in.(${moduleIds.join(',')})`);
  if (after.length !== 65 || after.some(l => !l.published_revision_id)) throw new Error('Publication did not cover all 65 lessons');
  console.log('Verified: 65/65 lessons have a published revision. Course and chapter activation were not requested.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
