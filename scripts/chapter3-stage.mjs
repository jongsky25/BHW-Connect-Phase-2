#!/usr/bin/env node
// Chapter III draft staging. `--check` is fully offline. Project modes must
// only be run after the course owner explicitly triggers live migration.
// This script has no publish or chapter-activation operation.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, loadReferenceModule } from './lib/reference-content.mjs';
import { planReferenceLoad, applyReferenceLoad, referenceReport } from './lib/reference-load.mjs';
import { createClient, projectUrl, requireEnv, signIn } from './lib/supabase-rest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = path.join(root, 'content/training/chapter3-core-competencies');
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const blueprint = json(path.join(packageRoot, 'chapter-blueprint.json'));
const moduleRows = blueprint.modules.map(m => ({ ...m, authored: json(path.join(packageRoot, 'drafts', m.module_key, 'module.json')) }));
const modules = moduleRows.map(m => loadReferenceModule(path.join(packageRoot, 'drafts', m.module_key), path.join(root, 'public')));

function argsOf(argv) {
  const args = { check: false, project: null, orgUnit: null, apply: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--project') args.project = argv[++i];
    else if (argv[i] === '--org-unit') args.orgUnit = argv[++i];
    else if (argv[i] === '--apply') args.apply = true;
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (!args.check && (!args.project || !args.orgUnit)) throw new Error('Use --check for offline validation, or provide --project and --org-unit after the migration trigger');
  if (args.check && (args.project || args.orgUnit || args.apply)) throw new Error('--check is offline only');
  if (args.project && !/^(local|[a-z0-9]+)$/.test(args.project)) throw new Error('Invalid project ref');
  return args;
}

function lockFile(ref) { return path.join(packageRoot, 'locks', `${ref}.json`); }
function saveLock(ref, lock) {
  const file = lockFile(ref);
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, JSON.stringify(lock, null, 2) + '\n');
  renameSync(temporary, file);
}

async function main() {
  const args = argsOf(process.argv.slice(2));
  assert.equal(blueprint.publication_allowed, false);
  assert.equal(blueprint.availability, 'unavailable');
  const program = json(path.join(root, 'content/training/day1-basic-competencies/program.json'));
  const chapter = program.chapters.find(c => c.chapter_key === 'chapter-3');
  assert.equal(chapter?.availability, 'unavailable');
  assert.equal(chapter?.delivery_course, null);
  if (args.check) {
    console.log(`Offline package: ${modules.length} modules, ${modules.reduce((n, m) => n + m.lessons.length, 0)} valid lessons. No project contacted.`);
    return;
  }
  const url = projectUrl(args.project);
  const anonKey = process.env.KB_LOADER_ANON_KEY ?? requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const username = requireEnv('KB_LOADER_USERNAME');
  const token = await signIn(url, anonKey, username, requireEnv('KB_LOADER_PASSWORD'));
  const client = createClient(url, anonKey, token);
  const [author] = await client.get(`users?select=id,role,status&username=eq.${encodeURIComponent(username)}`);
  if (!author || author.role !== 'admin' || author.status !== 'active') throw new Error('An active admin is required');
  const orgs = await client.get(`org_units?select=id,name&name=eq.${encodeURIComponent(args.orgUnit)}`);
  if (orgs.length !== 1) throw new Error('Resolve the exact organization before staging');
  const orgUnitId = orgs[0].id;
  const file = lockFile(args.project);
  const lock = existsSync(file) ? json(file) : { course: null, modules: {}, lessons: {} };
  const title = blueprint.title_en;
  const candidateCourses = await client.get(`courses?select=id,org_unit_id,status,title_en&org_unit_id=eq.${orgUnitId}&title_en=eq.${encodeURIComponent(title)}`);
  if (candidateCourses.length > 1) throw new Error('Duplicate Chapter III course titles; reconcile before staging');
  if (candidateCourses[0] && lock.course !== candidateCourses[0].id) throw new Error('Existing Chapter III course has no matching lock; reconcile before staging');
  if (lock.course && (!candidateCourses[0] || candidateCourses[0].id !== lock.course)) throw new Error('Course lock is stale or points to another organization');
  if (candidateCourses[0]?.status !== undefined && candidateCourses[0].status !== 'draft') throw new Error('Chapter III course must remain draft');

  let courseId = lock.course;
  if (!courseId && args.apply) {
    const [row] = await client.insert('courses', [{ org_unit_id: orgUnitId, author_user_id: author.id, title_fil: blueprint.title_fil, title_en: title, description_fil: 'Kabanata III — draft para sa pagsusuri', description_en: 'Chapter III — draft for review', status: 'draft', quiz_passing_percent: 80, quiz_max_attempts: 3 }]);
    courseId = row.id;
    lock.course = courseId;
    saveLock(args.project, lock);
  }
  const report = { project: args.project, organization: args.orgUnit, course: courseId ? 'draft-existing' : 'draft-create', modules: [], module_guides: [], lesson_plan: null, chapter_mapping: 'unchanged/unavailable', publication: 'not performed' };
  for (const m of moduleRows) {
    const existing = courseId ? await client.get(`course_modules?select=id,course_id,position,title_en&course_id=eq.${courseId}&position=eq.${m.authored.position}`) : [];
    if (existing.length > 1) throw new Error(`${m.module_key}: duplicate module positions`);
    const row = existing[0];
    if (row && (lock.modules[m.module_key] !== row.id || row.title_en !== m.title_en)) throw new Error(`${m.module_key}: module identity differs from lock`);
    if (!row && lock.modules[m.module_key]) throw new Error(`${m.module_key}: stale module lock`);
    report.modules.push({ key: m.module_key, action: row ? 'unchanged' : 'create' });
    if (!row && args.apply) {
      const [created] = await client.insert('course_modules', [{ course_id: courseId, position: m.authored.position, type: 'text', title_fil: m.title_fil, title_en: m.title_en, body_fil: '', body_en: '', video_url: null, objectives_fil: m.authored.objectives_fil, objectives_en: m.authored.objectives_en, summary_fil: m.authored.summary_fil, summary_en: m.authored.summary_en, lesson: null }]);
      lock.modules[m.module_key] = created.id;
      saveLock(args.project, lock);
    }
  }
  if (args.apply || courseId && moduleRows.every(m => lock.modules[m.module_key])) {
    const plan = await planReferenceLoad(client, modules, lock, { orgUnitId, promote: false });
    report.lesson_plan = referenceReport(plan);
    if (args.apply) await applyReferenceLoad(client, plan, lock, author.id, async () => saveLock(args.project, lock));
  } else report.lesson_plan = 'Requires draft course and all module rows';
  if (args.apply || courseId && moduleRows.every(m => lock.modules[m.module_key])) for (const m of moduleRows) {
    const dir = path.join(packageRoot, 'drafts', m.module_key);
    const competency = json(path.join(dir, 'competency.json'));
    const payload = {
      notes_fil: readFileSync(path.join(dir, 'facilitator-notes.fil.md'), 'utf8'),
      notes_en: readFileSync(path.join(dir, 'facilitator-notes.en.md'), 'utf8'),
      competency_statement_fil: competency.competency_statement_fil,
      competency_statement_en: competency.competency_statement_en,
      observation_indicators: competency.observation_indicators,
      activities: json(path.join(dir, 'facilitator-activities.json')),
    };
    const rows = await client.get(`course_module_facilitator_notes?select=*&module_id=eq.${lock.modules[m.module_key]}`);
    if (rows.length > 1) throw new Error(`${m.module_key}: duplicate module guides`);
    const existing = rows[0];
    if (existing && Object.keys(payload).some(k => canonical(existing[k]) !== canonical(payload[k]))) throw new Error(`${m.module_key}: existing module guide differs; reconcile before staging`);
    report.module_guides.push({ key: m.module_key, action: existing ? 'unchanged' : 'create' });
    if (!existing && args.apply) await client.insert('course_module_facilitator_notes', [{ module_id: lock.modules[m.module_key], ...payload }]);
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch(e => { console.error(e); process.exitCode = 1; });
