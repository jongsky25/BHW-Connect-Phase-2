#!/usr/bin/env node
// P2 draft loader. --dry-run validates the reviewed P1 packet without a DB.
// --apply is deliberately limited to the disposable local stack in this PR.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGabayContent } from './lib/gabay-content.mjs';
import { createClient, projectUrl, requireEnv, signIn } from './lib/supabase-rest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lockFile = path.join(root, 'content/training/philhealth-gabay/locks/local.json');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const value = (flag) => { const i = args.indexOf(flag); return i < 0 ? null : args[i + 1]; };
const allowed = new Set(['--apply','--dry-run','--project','--org-unit','--owner']);
if (args.some((arg) => arg.startsWith('--') && !allowed.has(arg))) throw new Error('unknown argument');
if (apply && args.includes('--dry-run')) throw new Error('choose --apply or --dry-run');
const content = loadGabayContent();
if (content.modules.some((m) => m.claim_ids.some((id) => id.startsWith('PH-') && (!content.sources[id]?.length || !content.sources[id].every((url) => url.startsWith('https://'))))))
  throw new Error('invalid source URL');
console.log(JSON.stringify({ course: content.id, lessons: content.modules.length, quizQuestions: content.questions.length,
  diagnostic: content.opening_diagnostic.length, passingPercent: content.quiz_passing_percent,
  maxAttempts: content.quiz_max_attempts, mode: apply ? 'local draft apply' : 'offline dry run' }, null, 2));
if (!apply) process.exit(0);
if (value('--project') !== 'local') throw new Error('P2 apply is limited to --project local');
const orgName = value('--org-unit');
const owner = value('--owner');
if (!orgName || !owner) throw new Error('--org-unit and --owner are required for local apply');
if (owner !== process.env.KB_LOADER_USERNAME) throw new Error('--owner must match the signed-in admin');
const url = projectUrl('local');
const anonKey = process.env.KB_LOADER_ANON_KEY ?? requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const token = await signIn(url, anonKey, requireEnv('KB_LOADER_USERNAME'), requireEnv('KB_LOADER_PASSWORD'));
const client = createClient(url, anonKey, token);
const orgRows = await client.get(`org_units?select=id,name&name=eq.${encodeURIComponent(orgName)}`);
if (orgRows.length !== 1) throw new Error('org unit name must resolve uniquely');
const [org] = orgRows;
const [admin] = await client.get(`users?select=id,role,status&username=eq.${encodeURIComponent(owner)}`);
if (!org || !admin || admin.role !== 'admin' || admin.status !== 'active') throw new Error('active admin and org unit required');
const lock = existsSync(lockFile) ? JSON.parse(readFileSync(lockFile, 'utf8')) : { course: null, modules: {}, questions: {} };
const save = () => { mkdirSync(path.dirname(lockFile), { recursive: true }); writeFileSync(lockFile, `${JSON.stringify(lock, null, 2)}\n`); };
if (!lock.course) {
  const prior = await client.get(`courses?select=id&title_en=eq.${encodeURIComponent(content.title_en)}`);
  if (prior.length) throw new Error('matching course exists without a lock; reconcile before apply');
} else {
  const [prior] = await client.get(`courses?select=id,status,org_unit_id&id=eq.${lock.course}`);
  if (!prior || prior.status !== 'draft' || prior.org_unit_id !== org.id) throw new Error('locked course must remain a draft in the selected org');
  const progress = await client.get(`course_progress?select=id&course_id=eq.${lock.course}&limit=1`);
  if (progress.length) throw new Error('course has learner progress; refuse source overwrite');
}
const coursePayload = {
  org_unit_id: org.id, author_user_id: admin.id,
  title_fil: content.title_fil, title_en: content.title_en,
  description_fil: content.description_fil, description_en: content.description_en,
  status: 'draft', assessment_kind: content.assessment_kind,
  opening_diagnostic: content.opening_diagnostic,
  quiz_passing_percent: content.quiz_passing_percent, quiz_max_attempts: content.quiz_max_attempts,
};
if (lock.course) await client.patch(`courses?id=eq.${lock.course}`, coursePayload);
else { const [row] = await client.insert('courses', [coursePayload]); lock.course = row.id; save(); }

for (const mod of [...content.modules, { id: 'gabay-quiz', position: 6, type: 'quiz', title_fil: 'Pangwakas na pagsusulit', title_en: 'Final knowledge quiz', body_fil: '', body_en: '' }]) {
  const payload = { course_id: lock.course, position: mod.position, type: mod.type,
    title_fil: mod.title_fil, title_en: mod.title_en, body_fil: mod.body_fil,
    body_en: mod.body_en, video_url: null };
  const existingId = lock.modules[mod.id];
  if (existingId) {
    const [prior] = await client.get(`course_modules?select=id,course_id&id=eq.${existingId}`);
    if (!prior || prior.course_id !== lock.course) throw new Error(`module lock mismatch: ${mod.id}`);
    await client.patch(`course_modules?id=eq.${existingId}`, payload);
  } else {
    const [row] = await client.insert('course_modules', [payload]); lock.modules[mod.id] = row.id; save();
  }
}
for (const question of content.questions) {
  const payload = { module_id: lock.modules['gabay-quiz'], position: question.position,
    prompt_fil: question.prompt_fil, prompt_en: question.prompt_en,
    options: question.options, correct_option_index: question.correct_option_index,
    rationale_fil: question.rationale_fil, rationale_en: question.rationale_en };
  const existingId = lock.questions[question.id];
  if (existingId) {
    const [prior] = await client.get(`course_quiz_questions?select=id,module_id&id=eq.${existingId}`);
    if (!prior || prior.module_id !== lock.modules['gabay-quiz']) throw new Error(`question lock mismatch: ${question.id}`);
    await client.patch(`course_quiz_questions?id=eq.${existingId}`, payload);
  } else {
    const [row] = await client.insert('course_quiz_questions', [payload]); lock.questions[question.id] = row.id; save();
  }
}
console.log(`Local draft ready: ${lock.course}. This loader never publishes.`);
