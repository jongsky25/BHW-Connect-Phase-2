// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it } from 'vitest';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ids = { learner: uuid(1), stranger: uuid(2), org: uuid(3), program: uuid(4), course: uuid(5), chapter: uuid(6),
  admin: uuid(8), reviewer: uuid(9), nextReviewer: uuid(10) };
const migration = 'supabase/migrations/20261011023009_chapter1_assessment_v2_core.sql';
let db;

function migrationFunction(file, name) {
  const sql = read(`supabase/migrations/${file}`);
  const start = sql.indexOf(`create or replace function public.${name}(`);
  return sql.slice(start, sql.indexOf('$$;', start) + 3);
}

async function actor(id, fn) {
  await db.exec('savepoint actor_call');
  await db.exec(`set role ${id ? 'authenticated' : 'anon'}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']);
  try { const result = await fn(); await db.exec('reset role; release savepoint actor_call'); return result; }
  catch (error) { await db.exec('rollback to savepoint actor_call; reset role; release savepoint actor_call'); throw error; }
}

const call = (id, name, params, values) => actor(id, () => db.query(`select public.${name}(${params}) as result`, values));

beforeAll(async () => {
  db = new PGlite();
  await db.exec(read('scripts/tests/fixtures/assessor-study-platform.sql'));
  await db.exec(`create role service_role nologin bypassrls;
    alter table public.course_lessons add column lesson_key text;
    alter table public.users add column full_name text default 'Person';
    create table public.course_lesson_progress(course_progress_id uuid, lesson_id uuid);
    create table public.feature_flags(key text primary key, enabled boolean, disabled_roles text[] default '{}');
    create table public.course_sessions(id uuid primary key, course_id uuid references public.courses(id),
      facilitator_user_id uuid, org_unit_id uuid);
    create table public.course_session_enrollments(session_id uuid, bhw_user_id uuid);
    create table public.course_progress(id uuid primary key, course_id uuid, bhw_user_id uuid, status text);
    create table public.course_module_progress(course_progress_id uuid);
    create table public.course_test_attempts(id uuid primary key default gen_random_uuid(), course_id uuid,
      bhw_user_id uuid, session_id uuid, phase text, score_percent numeric, answers jsonb,
      taken_at timestamptz default now(), unique(course_id,bhw_user_id,phase));
    create table public.course_test_questions(id uuid primary key,course_id uuid,position integer,
      prompt_fil text,prompt_en text,options jsonb,correct_option_index integer);
    create view public.course_test_questions_current with (security_invoker=true) as
      select * from public.course_test_questions;
    alter table public.course_test_questions enable row level security;
    grant select on public.course_test_questions, public.course_test_questions_current,
      public.courses, public.org_units to authenticated;
    create function public.rpc_course_test_submit(uuid,text,jsonb,uuid default null)
      returns table(score_percent numeric) language sql as $$ select 0::numeric $$;
    create function public.rpc_course_progress_reset(uuid,uuid)
      returns table(had_progress boolean,modules_cleared integer,test_attempts_cleared integer)
      language sql as $$ select false,0,0 $$;`);
  for (const name of ['current_app_user', 'current_org_path'])
    await db.exec(migrationFunction('20260720000000_baseline_captured_from_remote.sql', name));
  await db.exec(read(migration));
  await db.exec(`create function public.org_unit_path(p_id uuid) returns text language sql stable
    as $$ select path from public.org_units where id=p_id $$;`);
  await db.exec(read('supabase/migrations/20261011023753_learner_safe_legacy_bank.sql'));
  await db.exec(read('supabase/migrations/20261011024237_legacy_posttest_review.sql'));
  await db.exec(read('supabase/migrations/20261011024500_chapter1_assessment_reset_integration.sql'));
  await db.exec(read('supabase/migrations/20261011024838_chapter1_practice.sql'));
  await db.exec(read('supabase/migrations/20261011025138_chapter1_learning_notes.sql'));
  await db.exec(read('supabase/migrations/20261011030000_chapter1_review_and_reset.sql'));
  await db.exec(read('supabase/migrations/20261011033000_chapter1_intro_views.sql'));
  await db.exec(`create schema assessor_private;
    create table public.assessor_exam_attempts(
      id uuid primary key default gen_random_uuid(), assessor_user_id uuid, chapter_id uuid,
      curriculum_version text, exam_id text, phase text, status text,
      question_set_hash text, question_count integer, passing_percent numeric,
      score_percent numeric, passed boolean, answers jsonb, pretest_late boolean,
      submitted_at timestamptz, started_at timestamptz default now());
    create table public.assessor_lesson_progress(assessor_user_id uuid, chapter_id uuid,
      lesson_id uuid, revision_id uuid);
    create function assessor_private.exam_context(p_chapter_id uuid)
    returns table(actor_id uuid,course_id uuid,chapter_key text,curriculum_version text,
      required_lessons jsonb,minimum_questions integer,passing_percent numeric)
    language sql security definer set search_path = '' as $$
      select u.id,ch.course_id,ch.chapter_key,'chapter1-v1'::text,'[]'::jsonb,30,80::numeric
      from public.current_app_user() u join public.training_program_chapters ch on ch.id=p_chapter_id
      where u.role='assessor' and u.status='active' $$;
    create function assessor_private.chapter_lessons_complete(uuid,uuid,uuid,jsonb)
      returns boolean language sql as $$ select true $$;
    create function public.rpc_assessor_exam_open(uuid,text)
      returns jsonb language sql as $$ select '{}'::jsonb $$;`);
  await db.exec(read('supabase/migrations/20261012152647_assessor_chapter1_shared_assessment.sql'));
  await db.query('insert into org_units values($1,$2)', [ids.org, `${ids.org}.`]);
  for (const [id, role] of [[ids.learner, 'bhw'], [ids.stranger, 'bhw'], [ids.admin, 'admin'],
    [ids.reviewer, 'assessor'], [ids.nextReviewer, 'assessor']])
    await db.query('insert into users(id,auth_user_id,role,status,org_unit_id) values($1,$1,$2,$3,$4)', [id, role, 'active', ids.org]);
  await db.query("insert into training_programs values($1,'bhw-reference-manual','published',$2)", [ids.program, ids.org]);
  await db.query("insert into courses values($1,'published',$2)", [ids.course, ids.org]);
  await db.query("insert into training_program_chapters values($1,$2,'chapter-1',$3,'available')", [ids.chapter, ids.program, ids.course]);
  await db.exec("insert into feature_flags values('chapter1_assessment_v2',true,'{}');");
  await db.query("insert into course_test_questions values($1,$2,0,'Lihim na tanong','Secret question','[]',2)", [uuid(50), ids.course]);
  const items = Array.from({ length: 30 }, (_, i) => ({
    item_id: uuid(100 + i), slot: `T${String(i + 1).padStart(2, '0')}`,
    stem: { en: `Question ${i + 1}`, fil: `Tanong ${i + 1}` },
    options: [{ id: 'a', label: { en: 'A', fil: 'A' } }, { id: 'b', label: { en: 'B', fil: 'B' } },
      { id: 'c', label: { en: 'C', fil: 'C' } }],
    correct_option_id: 'a', rationale: { en: 'Because A', fil: 'Dahil A' },
    accidental_key: 'never send me', lesson_keys: ['bhw-roles-hepo'],
  }));
  await db.query("insert into learner_assessment_private.releases(id,blueprint_id,source_commit,program_key,chapter_key,curriculum_revisions,content_hash,status) values('r1','b1','commit','bhw-reference-manual','chapter-1','[]',$1,'active')", ['a'.repeat(64)]);
  for (const phase of ['pretest', 'posttest'])
    await db.query('insert into learner_assessment_private.forms values($1,$2,$3,$4,$5)',
      [`f-${phase}`, 'r1', phase, JSON.stringify(items), 'b'.repeat(64)]);
  const practiceItems = [200, 201, 202, 203].map((n, i) => ({ ...items[i], item_id: uuid(n), target: 'G01' }));
  await db.query('insert into learner_assessment_private.checkpoints values($1,$2,$3,$4,$5)',
    ['r1', 'G01', 'bhw-roles-hepo', JSON.stringify(practiceItems.slice(0, 2)), JSON.stringify(practiceItems.slice(2))]);
}, 30000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => { await db.exec('begin'); });
afterEach(async () => { await db.exec('rollback'); });

describe('Chapter 1 private learner attempt contract', () => {
  it('serves the identical Chapter 1 form to BHW and assessor and records assessor evidence separately', async () => {
    const bhw = (await call(ids.learner, 'rpc_learner_assessment_start', '$1,$2', [ids.course, 'pretest'])).rows[0].result;
    const assessor = (await call(ids.reviewer, 'rpc_learner_assessment_start', '$1,$2', [ids.course, 'pretest'])).rows[0].result;
    expect(assessor.form_id).toBe(bhw.form_id);
    expect(assessor.items).toEqual(bhw.items);
    const changes = assessor.items.map(item => ({item_id:item.item_id,kind:'choice',option_id:'a'}));
    const saved = (await call(ids.reviewer, 'rpc_learner_assessment_save', '$1,$2,$3,$4::jsonb,$5,$6',
      [assessor.attempt_id,0,uuid(950),JSON.stringify(changes),29,'en'])).rows[0].result;
    await call(ids.reviewer, 'rpc_learner_assessment_submit', '$1,$2,$3',
      [assessor.attempt_id,saved.revision,uuid(951)]);
    const pre = (await call(ids.reviewer, 'rpc_learner_assessment_get', '$1', [assessor.attempt_id])).rows[0].result;
    expect(pre.legacy_attempt_id).toBeTruthy();
    expect((await db.query('select count(*)::integer as n from public.course_test_attempts')).rows[0].n).toBe(0);
    expect((await db.query('select phase,score_percent::double precision as score_percent from public.assessor_exam_attempts')).rows)
      .toEqual([{phase:'pretest',score_percent:100}]);
    await expect(call(ids.reviewer, 'rpc_chapter_practice_start', '$1,$2', [ids.course, 'G01']))
      .rejects.toThrow(/finish the mapped lesson/);
    await db.query('insert into course_modules values($1,$2)', [uuid(960), ids.course]);
    await db.query('insert into course_lessons(id,module_id,published_revision_id,lesson_key) values($1,$2,$3,$4)',
      [uuid(961),uuid(960),uuid(962),'bhw-roles-hepo']);
    await db.query('insert into assessor_lesson_progress values($1,$2,$3,$4)',
      [ids.reviewer,ids.chapter,uuid(961),uuid(962)]);
    expect((await call(ids.reviewer, 'rpc_chapter_practice_start', '$1,$2', [ids.course, 'G01'])).rows[0].result.group_key)
      .toBe('G01');
    const post = (await call(ids.reviewer, 'rpc_learner_assessment_start', '$1,$2', [ids.course, 'posttest'])).rows[0].result;
    expect(post.form_id).toBe('f-posttest');
    const postChanges = post.items.map((item, i) => ({item_id:item.item_id,kind:'choice',option_id:i<23?'a':'b'}));
    const savedPost = (await call(ids.reviewer, 'rpc_learner_assessment_save', '$1,$2,$3,$4::jsonb,$5,$6',
      [post.attempt_id,0,uuid(952),JSON.stringify(postChanges),29,'en'])).rows[0].result;
    await call(ids.reviewer, 'rpc_learner_assessment_submit', '$1,$2,$3',
      [post.attempt_id,savedPost.revision,uuid(953)]);
    const retry = (await call(ids.reviewer, 'rpc_learner_assessment_start', '$1,$2', [ids.course, 'posttest'])).rows[0].result;
    expect(retry.attempt_id).not.toBe(post.attempt_id);
    const retryChanges = retry.items.map((item, i) => ({item_id:item.item_id,kind:'choice',option_id:i<24?'a':'b'}));
    const savedRetry = (await call(ids.reviewer, 'rpc_learner_assessment_save', '$1,$2,$3,$4::jsonb,$5,$6',
      [retry.attempt_id,0,uuid(954),JSON.stringify(retryChanges),29,'en'])).rows[0].result;
    await call(ids.reviewer, 'rpc_learner_assessment_submit', '$1,$2,$3',
      [retry.attempt_id,savedRetry.revision,uuid(955)]);
    const result = (await call(ids.reviewer, 'rpc_learner_assessment_get', '$1', [retry.attempt_id])).rows[0].result;
    expect(result.score_percent).toBe(80);
    expect((await call(ids.reviewer, 'rpc_learner_assessment_review', '$1', [result.legacy_attempt_id])).rows[0].result.items).toHaveLength(30);
    await expect(call(ids.nextReviewer, 'rpc_learner_assessment_review', '$1', [result.legacy_attempt_id]))
      .rejects.toThrow(/authorized/);
    await expect(call(ids.reviewer, 'rpc_learner_assessment_start', '$1,$2', [ids.course, 'posttest']))
      .rejects.toThrow(/already passed/);
    await expect(call(ids.stranger, 'rpc_learner_assessment_get', '$1', [assessor.attempt_id])).rejects.toThrow(/authorized/);
  });
  it('resumes a draft, hides keys and handles unknown responses and an idempotent final submission', async () => {
    const start = () => call(ids.learner, 'rpc_learner_assessment_start', '$1,$2', [ids.course, 'pretest']);
    const first = (await start()).rows[0].result;
    expect(first.items).toHaveLength(30);
    expect(first.items[0]).not.toHaveProperty('correct_option_id');
    expect(first.items[0]).not.toHaveProperty('rationale');
    expect(first.items[0]).not.toHaveProperty('accidental_key');
    expect((await start()).rows[0].result.attempt_id).toBe(first.attempt_id);
    const changes = first.items.map((item, i) => ({ item_id: item.item_id, kind: i === 0 ? 'unknown' : 'choice',
      ...(i === 0 ? {} : { option_id: 'a' }) }));
    const mutation = uuid(999);
    const save = () => call(ids.learner, 'rpc_learner_assessment_save', '$1,$2,$3,$4::jsonb,$5,$6',
      [first.attempt_id, 0, mutation, JSON.stringify(changes), 29, 'en']);
    expect((await save()).rows[0].result.revision).toBe(1);
    expect((await save()).rows[0].result.revision).toBe(1);
    const submit = () => call(ids.learner, 'rpc_learner_assessment_submit', '$1,$2,$3',
      [first.attempt_id, 1, uuid(998)]);
    const final = (await submit()).rows[0].result;
    expect(final).toMatchObject({ score_percent: 96.7, correct_count: 29 });
    expect((await submit()).rows[0].result.legacy_attempt_id).toBe(final.legacy_attempt_id);
    await db.query("insert into course_progress values($1,$2,$3,'completed')", [uuid(7), ids.course, ids.learner]);
    const post = (await call(ids.learner, 'rpc_learner_assessment_start', '$1,$2', [ids.course, 'posttest'])).rows[0].result;
    await call(ids.learner, 'rpc_learner_assessment_save', '$1,$2,$3,$4::jsonb,$5,$6',
      [post.attempt_id, 0, uuid(997), JSON.stringify(changes), 29, 'en']);
    const postFinal = (await call(ids.learner, 'rpc_learner_assessment_submit', '$1,$2,$3',
      [post.attempt_id, 1, uuid(996)])).rows[0].result;
    const review = (await call(ids.learner, 'rpc_learner_assessment_review', '$1', [postFinal.legacy_attempt_id])).rows[0].result;
    expect(review.items[0].correct_option_id).toBe('a');
    expect(review.items[0]).not.toHaveProperty('accidental_key');
    expect(review.responses[0].kind).toBe('unknown');
    const legacy = (await db.query("select answers from course_test_attempts where phase='pretest'")).rows[0].answers;
    expect(legacy[0]).toMatchObject({ response_kind: 'unknown', selected_option_index: null });
  });

  it('denies foreign draft reads and duplicate or invalid saved responses', async () => {
    const first = (await call(ids.learner, 'rpc_learner_assessment_start', '$1,$2', [ids.course, 'pretest'])).rows[0].result;
    await expect(call(ids.stranger, 'rpc_learner_assessment_get', '$1', [first.attempt_id])).rejects.toThrow(/authorized/);
    const bad = [{ item_id: first.items[0].item_id, kind: 'choice', option_id: 'foreign' }];
    await expect(call(ids.learner, 'rpc_learner_assessment_save', '$1,$2,$3,$4::jsonb,$5,$6',
      [first.attempt_id, 0, uuid(90), JSON.stringify(bad), 0, 'fil'])).rejects.toThrow(/invalid response option/);
    await expect(call(ids.learner, 'rpc_learner_assessment_submit', '$1,$2,$3',
      [first.attempt_id, 0, uuid(91)])).rejects.toThrow(/all 30/);
    const valid = [{ item_id: first.items[0].item_id, kind: 'choice', option_id: 'a' }];
    await call(ids.learner, 'rpc_learner_assessment_save', '$1,$2,$3,$4::jsonb,$5,$6',
      [first.attempt_id, 0, uuid(92), JSON.stringify(valid), 0, 'fil']);
    await expect(call(ids.learner, 'rpc_learner_assessment_save', '$1,$2,$3,$4::jsonb,$5,$6',
      [first.attempt_id, 0, uuid(93), JSON.stringify(valid), 0, 'fil'])).rejects.toThrow(/stale/);
    await expect(actor(ids.learner, () => db.query('select * from learner_assessment_private.attempts'))).rejects.toThrow(/permission denied/);
  });
  it('resumes a draft after disabling new starts and clears it on scoped reset', async () => {
    const first = (await call(ids.learner, 'rpc_learner_assessment_start', '$1,$2', [ids.course, 'pretest'])).rows[0].result;
    await db.exec("update feature_flags set enabled=false where key='chapter1_assessment_v2'");
    expect((await call(ids.learner, 'rpc_learner_assessment_start', '$1,$2', [ids.course, 'pretest'])).rows[0].result.attempt_id).toBe(first.attempt_id);
    await expect(call(ids.stranger, 'rpc_learner_assessment_start', '$1,$2', [ids.course, 'pretest']))
      .rejects.toThrow(/starts unavailable/);
    await db.query('select * from public.rpc_course_progress_reset($1,$2)', [ids.course, ids.learner]);
    expect((await db.query('select count(*)::integer as n from learner_assessment_private.attempts')).rows[0].n).toBe(0);
    expect((await db.query('select count(*)::integer as n from learner_assessment_private.enrollments')).rows[0].n).toBe(0);
  });
  it('limits session form metadata to its facilitator and scoped admin', async () => {
    const sessionId = uuid(70);
    await db.query('insert into course_sessions values($1,$2,$3,$4)',
      [sessionId, ids.course, ids.reviewer, ids.org]);
    expect((await call(ids.reviewer, 'rpc_learner_assessment_session_forms', '$1', [sessionId])).rows).toEqual([]);
    expect((await call(ids.admin, 'rpc_learner_assessment_session_forms', '$1', [sessionId])).rows).toEqual([]);
    await expect(call(ids.nextReviewer, 'rpc_learner_assessment_session_forms', '$1', [sessionId]))
      .rejects.toThrow(/authorized/);
  });
  it('clears unshared notes on reset and keeps shared note history', async () => {
    const save = (scope, text, mutation) => call(ids.learner, 'rpc_learning_notes_save',
      '$1,$2,$3,$4,$5,$6,$7', [ids.course, scope, 0, mutation, text, '', 'en']);
    await save('entry', 'Keep this shared note.', uuid(710));
    await call(ids.learner, 'rpc_learning_notes_share', '$1,$2,$3,$4,$5',
      [ids.course, 'entry', 1, uuid(711), false]);
    await save('chapter', 'Private unfinished note.', uuid(712));
    await db.query('select * from public.rpc_course_progress_reset($1,$2)', [ids.course, ids.learner]);
    const notes = (await db.query('select scope_key from learner_assessment_private.reflection_drafts')).rows;
    expect(notes).toEqual([{ scope_key: 'entry' }]);
    expect((await db.query('select count(*)::integer as n from learner_assessment_private.reflection_versions')).rows[0].n).toBe(1);
  });
  it('shows each major introduction once per learner and restores it after progress reset', async () => {
    const open = id => call(id, 'rpc_chapter_intro_open', '$1,$2',
      [ids.course, 'chapter1-major-1-introduction']);
    expect((await open(ids.learner)).rows[0].result).toBe(true);
    expect((await open(ids.learner)).rows[0].result).toBe(false);
    expect((await open(ids.stranger)).rows[0].result).toBe(true);
    await db.query('select * from public.rpc_course_progress_reset($1,$2)', [ids.course, ids.learner]);
    expect((await open(ids.learner)).rows[0].result).toBe(true);
    expect((await open(ids.stranger)).rows[0].result).toBe(false);
    await expect(call(ids.learner, 'rpc_chapter_intro_open', '$1,$2', [ids.course, 'other']))
      .rejects.toThrow(/invalid introduction/);
  });
  it('serves legacy stems without keys while denying the raw bank to learners', async () => {
    const safe = (await call(ids.learner, 'rpc_course_test_question_delivery', '$1', [ids.course])).rows;
    expect(safe).toHaveLength(1);
    expect(safe[0]).not.toHaveProperty('correct_option_index');
    expect((await actor(ids.learner, () => db.query('select * from course_test_questions'))).rows).toHaveLength(0);
    expect((await actor(ids.learner, () => db.query('select * from course_test_questions_current'))).rows).toHaveLength(0);
    expect((await call(ids.learner, 'rpc_course_test_bank_available', '$1::uuid[]', [[ids.course]])).rows)
      .toEqual([{ result: ids.course }]);
  });
  it('reviews historical responses without changing the score or inventing form membership', async () => {
    const finalId = uuid(60);
    const saved = [{question_id: uuid(50), selected_option_index: 2},
      {question_id: uuid(50), selected_option_index: 1},
      {question_id: uuid(51), selected_option_index: 0}];
    await db.query("insert into course_test_attempts(id,course_id,bhw_user_id,phase,score_percent,answers) values($1,$2,$3,'posttest',75,$4)",
      [finalId, ids.course, ids.learner, JSON.stringify(saved)]);
    const review = (await call(ids.learner, 'rpc_legacy_posttest_review', '$1', [finalId])).rows[0].result;
    expect(review.score_percent).toBe(75);
    expect(review.form_membership_known).toBe(false);
    expect(review.entries.map(entry => entry.status)).toEqual([
      'duplicate_response', 'duplicate_response', 'original_question_unavailable',
    ]);
    await expect(call(ids.stranger, 'rpc_legacy_posttest_review', '$1', [finalId])).rejects.toThrow(/unavailable/);
  });
  it('keeps checkpoint feedback behind a committed answer and labels repeats', async () => {
    await db.query("insert into course_progress values($1,$2,$3,'content_completed')", [uuid(7), ids.course, ids.learner]);
    const started = (await call(ids.learner, 'rpc_chapter_practice_start', '$1,$2', [ids.course, 'G01'])).rows[0].result;
    expect(started.first_items[0]).not.toHaveProperty('correct_option_id');
    const [first, second] = started.first_items;
    const alternate = started.alternate_items[0];
    const commit = (item, mutation) => call(ids.learner, 'rpc_chapter_practice_commit', '$1,$2,$3,$4,$5',
      [started.attempt_id, item.item_id, 'choice', 'a', mutation]);
    const result = (await commit(first, uuid(300))).rows[0].result;
    expect(result).toMatchObject({ first_for_item: true, correct: true });
    expect(result.feedback.correct_option_id).toBe('a');
    expect((await commit(first, uuid(300))).rows[0].result).toEqual(result);
    await expect(commit(alternate, uuid(301))).resolves.toBeDefined();
    await commit(second, uuid(302));
    const repeat = (await commit(first, uuid(303))).rows[0].result;
    expect(repeat.first_for_item).toBe(false);
    const state = (await call(ids.learner, 'rpc_chapter_practice_get', '$1', [started.attempt_id])).rows[0].result;
    expect(state.state).toBe('completed');
    expect(state.events).toHaveLength(4);
    await expect(call(ids.stranger, 'rpc_chapter_practice_get', '$1', [started.attempt_id])).rejects.toThrow(/authorized/);
  });
  it('keeps notes private until sharing, then restricts history and replies to the current reviewer', async () => {
    const save = (revision, insight, mutation) => call(ids.learner, 'rpc_learning_notes_save',
      '$1,$2,$3,$4,$5,$6,$7', [ids.course, 'entry', revision, mutation, insight, '', 'en']);
    const first = (await save(0, '', uuid(400))).rows[0].result;
    expect(first.revision).toBe(1);
    const empty = (await call(ids.learner, 'rpc_learning_notes_share', '$1,$2,$3,$4,$5',
      [ids.course, 'entry', 1, uuid(401), false])).rows[0].result;
    expect(empty.shared).toBe(false);
    await save(1, 'I need to clarify referrals.', uuid(402));
    const shared = (await call(ids.learner, 'rpc_learning_notes_share', '$1,$2,$3,$4,$5',
      [ids.course, 'entry', 2, uuid(403), false])).rows[0].result;
    expect(shared.shared).toBe(true);
    await save(2, 'A newer private draft.', uuid(404));
    await call(ids.admin, 'rpc_learning_reviewer_assign', '$1,$2,$3', [ids.learner, ids.course, ids.reviewer]);
    const read = id => call(id, 'rpc_learning_notes_reviewer', '$1,$2', [ids.learner, ids.course]);
    expect((await read(ids.reviewer)).rows[0].result.shared[0].insight).toBe('I need to clarify referrals.');
    await expect(read(ids.nextReviewer)).rejects.toThrow(/authorized/);
    await expect(read(ids.admin)).rejects.toThrow(/authorized/);
    await call(ids.reviewer, 'rpc_learning_notes_reply', '$1,$2,$3', [shared.version_id, 'Responded', 'Let us discuss this.']);
    expect((await call(ids.learner, 'rpc_learning_notes_own', '$1', [ids.course])).rows[0].result.shared[0].reviews[0].reply)
      .toBe('Let us discuss this.');
    await call(ids.admin, 'rpc_learning_reviewer_assign', '$1,$2,$3', [ids.learner, ids.course, ids.nextReviewer]);
    await expect(read(ids.reviewer)).rejects.toThrow(/authorized/);
    expect((await read(ids.nextReviewer)).rows[0].result.shared).toHaveLength(1);
  });
});
