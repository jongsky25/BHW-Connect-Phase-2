// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const v = {
  national: id(1), region: id(2), cityA: id(3), cityB: id(4), barangayA: id(5),
  doh: id(10), cityAdmin: id(11), bhwA: id(12), bhwB: id(13), assessorRegion: id(14), assessorCity: id(15),
  program: id(20), chapter: id(21), course: id(22), module: id(23), lessonA: id(24), lessonB: id(25),
  revisionA: id(26), revisionB: id(27), courseProgress: id(28), qualification: id(29),
};
let db;

async function as(actor, args = {}) {
  await db.exec('begin');
  try {
    await db.exec(`set local role ${actor ? 'authenticated' : 'anon'}`);
    await db.query("select set_config('test.actor',$1,true)", [actor ?? '']);
    const result = await db.query('select public.rpc_training_dashboard($1,$2,$3,$4,$5) as result', [
      args.org ?? null, args.chapter ?? null, args.role ?? 'all', args.search ?? null, args.page ?? 1,
    ]);
    await db.exec('commit');
    return result.rows[0].result;
  } catch (error) {
    await db.exec('rollback');
    throw error;
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role authenticated; create role anon;
    create schema assessor_private;
    create table public.org_units(id uuid primary key, name text, path text, parent_id uuid);
    create table public.users(id uuid primary key, role text, status text, org_unit_id uuid,
      username text, full_name text);
    create function public.current_app_user() returns public.users language sql stable as $$
      select u from public.users u where u.id::text = nullif(current_setting('test.actor', true), '')
    $$;
    create table public.training_programs(id uuid primary key, content_key text, status text, org_unit_id uuid);
    create table public.courses(id uuid primary key, status text, org_unit_id uuid);
    create table public.training_program_chapters(id uuid primary key, program_id uuid, course_id uuid,
      chapter_key text, position int, title_fil text, title_en text, availability text);
    create table public.course_modules(id uuid primary key, course_id uuid, position int);
    create table public.course_lessons(id uuid primary key, module_id uuid, lesson_key text,
      required boolean, published_revision_id uuid);
    create table public.course_progress(id uuid primary key, course_id uuid, bhw_user_id uuid,
      status text, content_completed_at timestamptz, started_at timestamptz);
    create table public.course_lesson_progress(course_progress_id uuid, lesson_id uuid, completed_at timestamptz);
    create table public.assessor_lesson_progress(assessor_user_id uuid, chapter_id uuid,
      lesson_id uuid, revision_id uuid, completed_at timestamptz);
    create table public.course_test_attempts(bhw_user_id uuid, course_id uuid, phase text,
      score_percent numeric, taken_at timestamptz);
    create table public.certificates(bhw_user_id uuid, course_id uuid, issued_at timestamptz);
    create table public.assessor_exam_attempts(assessor_user_id uuid, chapter_id uuid,
      curriculum_version text, phase text, score_percent numeric, started_at timestamptz,
      submitted_at timestamptz);
    create table public.assessor_orientation_attempts(assessor_user_id uuid, chapter_id uuid,
      curriculum_version text, correct_count int, question_count int, submitted_at timestamptz);
    create table public.assessor_chapter_qualifications(assessor_user_id uuid, chapter_id uuid,
      curriculum_version text, status text, issued_at timestamptz);
    create table assessor_private.exam_requirements(chapter_key text, curriculum_version text,
      required_lessons jsonb);
  `);
  const orgRows = [
    [v.national, 'Philippines', `${v.national}.`, null],
    [v.region, 'Region', `${v.national}.${v.region}.`, v.national],
    [v.cityA, 'City A', `${v.national}.${v.region}.${v.cityA}.`, v.region],
    [v.cityB, 'City B', `${v.national}.${v.region}.${v.cityB}.`, v.region],
    [v.barangayA, 'Barangay A', `${v.national}.${v.region}.${v.cityA}.${v.barangayA}.`, v.cityA],
  ];
  for (const row of orgRows) await db.query('insert into org_units values($1,$2,$3,$4)', row);
  await db.query(`insert into users values
    ($1,'admin','active',$7,'doh','DOH'),
    ($2,'admin','active',$8,'city.admin','City Admin'),
    ($3,'bhw','active',$9,'bhw.a','BHW A'),
    ($4,'bhw','active',$10,'bhw.b','BHW B'),
    ($5,'assessor','active',$11,'assessor.region','Regional Assessor'),
    ($6,'assessor','active',$8,'assessor.city','City Assessor')`,
  [v.doh, v.cityAdmin, v.bhwA, v.bhwB, v.assessorRegion, v.assessorCity,
    v.national, v.cityA, v.barangayA, v.cityB, v.region]);
  await db.query("insert into training_programs values ($1,'bhw-reference-manual','published',$2)",
    [v.program, v.national]);
  await db.query("insert into courses values ($1,'published',$2)", [v.course, v.national]);
  await db.query("insert into training_program_chapters values ($1,$2,$3,'chapter-1',1,'Kabanata 1','Chapter 1','available')",
    [v.chapter, v.program, v.course]);
  await db.query('insert into course_modules values ($1,$2,0)', [v.module, v.course]);
  await db.query("insert into course_lessons values ($1,$3,'a',true,$4),($2,$3,'b',true,$5)",
    [v.lessonA, v.lessonB, v.module, v.revisionA, v.revisionB]);
  await db.query(`insert into assessor_private.exam_requirements values
    ('chapter-1','v1','[{"position":0,"key":"a"},{"position":0,"key":"b"}]')`);
  await db.query("insert into course_progress values ($1,$2,$3,'certified','2026-09-04T09:00:00Z','2026-09-01T09:00:00Z')",
    [v.courseProgress, v.course, v.bhwA]);
  await db.query("insert into course_lesson_progress values ($1,$2,'2026-09-02T09:00:00Z'),($1,$3,'2026-09-03T09:00:00Z')",
    [v.courseProgress, v.lessonA, v.lessonB]);
  await db.query(`insert into assessor_lesson_progress values
    ($1,$3,$4,$6,'2026-09-02T10:00:00Z'),
    ($1,$3,$5,$7,'2026-09-03T10:00:00Z'),
    ($2,$3,$4,$6,'2026-09-02T11:00:00Z')`,
  [v.assessorCity, v.assessorRegion, v.chapter, v.lessonA, v.lessonB, v.revisionA, v.revisionB]);
  await db.query("insert into assessor_chapter_qualifications values ($1,$2,'v1','active','2026-09-06T10:00:00Z')",
    [v.assessorCity, v.chapter]);
  await db.query("insert into certificates values ($1,$2,'2026-09-07T09:00:00Z')", [v.bhwA, v.course]);
  await db.query("insert into course_test_attempts values ($1,$2,'pretest',55,'2026-09-01T10:00:00Z'),($1,$2,'posttest',85,'2026-09-05T09:00:00Z')", [v.bhwA, v.course]);
  await db.query("insert into assessor_exam_attempts values ($1,$2,'v1','pretest',60,'2026-09-01T10:00:00Z','2026-09-01T11:00:00Z'),($1,$2,'v1','posttest',70,'2026-09-03T12:00:00Z','2026-09-03T13:00:00Z'),($1,$2,'v1','posttest',90,'2026-09-04T10:00:00Z','2026-09-04T11:00:00Z')", [v.assessorCity, v.chapter]);
  await db.query("insert into assessor_orientation_attempts values ($1,$2,'v1',4,5,'2026-09-05T10:00:00Z')", [v.assessorCity, v.chapter]);
  const migration = readFileSync(new URL('../../supabase/migrations/20261010000000_course_progress_dashboard.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  const timestamps = readFileSync(new URL('../../supabase/migrations/20261011000000_training_dashboard_timestamps_scores.sql', import.meta.url), 'utf8');
  await db.exec(timestamps);
}, 30000);

afterAll(async () => { await db?.close(); });

describe('training dashboard catchment and course measures', () => {
  it('includes not-started people and separates expected from started', async () => {
    const result = await as(v.doh);
    expect(result.summary).toEqual([
      { role: 'assessor', eligible: 2, started: 2, content_completed: 1, final_completed: 1 },
      { role: 'bhw', eligible: 2, started: 1, content_completed: 1, final_completed: 1 },
    ]);
    expect(result.total).toBe(4);
    expect(result.areas).toEqual([
      { id: v.region, name: 'Region', role: 'assessor', eligible: 2, started: 2, content_completed: 1, final_completed: 1 },
      { id: v.region, name: 'Region', role: 'bhw', eligible: 2, started: 1, content_completed: 1, final_completed: 1 },
    ]);
  });

  it('counts an assessor only at the assigned geographic level', async () => {
    const result = await as(v.cityAdmin);
    expect(result.people.map(p => p.username).sort()).toEqual(['assessor.city', 'bhw.a']);
    expect(result.summary.find(s => s.role === 'assessor').eligible).toBe(1);
    expect(result.areas.map(a => [a.name, a.role, a.eligible])).toEqual([
      ['Barangay A', 'bhw', 1], ['City A', 'assessor', 1],
    ]);
    expect(result.people.find(p => p.role === 'assessor').chapters[0]).toMatchObject({
      lesson_done: 2, lesson_total: 2, content_completed: true, final_completed: true,
    });
    await expect(as(v.cityAdmin, { org: v.cityB })).rejects.toThrow(/area outside catchment/);
  });

  it('filters individual rows while keeping both aggregate role totals', async () => {
    const result = await as(v.doh, { role: 'assessor', search: 'Regional' });
    expect(result.total).toBe(1);
    expect(result.people[0].username).toBe('assessor.region');
    expect(result.summary).toHaveLength(2);
  });

  it('shows recorded dates and the latest score for each stage', async () => {
    const result = await as(v.doh);
    const bhw = result.people.find(p => p.username === 'bhw.a');
    expect(bhw.started_at).toBe('2026-09-01T09:00:00+00:00');
    expect(bhw.content_completed_at).toBe('2026-09-04T09:00:00+00:00');
    expect(bhw.final_completed_at).toBe('2026-09-07T09:00:00+00:00');
    expect(bhw.last_progress_at).toBe('2026-09-07T09:00:00+00:00');
    expect(bhw.chapters[0].scores).toMatchObject([
      { phase: 'pretest', score_percent: 55, attempts: 1 },
      { phase: 'posttest', score_percent: 85, attempts: 1 },
    ]);
    const assessor = result.people.find(p => p.username === 'assessor.city');
    expect(assessor.started_at).toBe('2026-09-01T10:00:00+00:00');
    expect(assessor.content_completed_at).toBe('2026-09-03T10:00:00+00:00');
    expect(assessor.final_completed_at).toBe('2026-09-06T10:00:00+00:00');
    expect(assessor.chapters[0].scores).toMatchObject([
      { phase: 'pretest', score_percent: 60, attempts: 1 },
      { phase: 'posttest', score_percent: 90, attempts: 2 },
      { phase: 'orientation', score_percent: 80, attempts: 1 },
    ]);
    expect(result.people.find(p => p.username === 'bhw.b').started_at).toBeNull();
  });

  it('rejects BHW and anonymous callers', async () => {
    await expect(as(v.bhwA)).rejects.toThrow(/not authorized/);
    await expect(as(null)).rejects.toThrow(/permission denied/);
  });
});
