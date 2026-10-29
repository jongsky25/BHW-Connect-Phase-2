// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('../../supabase/migrations/20261029000110_chapter2_diagnostic_context.sql', import.meta.url), 'utf8');
const old = [
  {position:10,module:5,prompt_en:'What should happen before choosing an update channel?',prompt_fil:'Ano ang dapat gawin bago pumili ng paraan ng pagpapabalita?',key:0,correct:'Ask people who miss updates.'},
  {position:12,module:6,prompt_en:'The practice map is done. What is the safe next step?',prompt_fil:'Tapos na ang mapa ng pagsasanay. Ano ang ligtas na susunod na hakbang?',key:1,correct:'Ask the DRRM office and health team to verify the map before use.'},
  {position:13,module:6,prompt_en:'You have confirmed the current lead. What is the safe next step?',prompt_fil:'Kumpirmado na ang kasalukuyang lead. Ano ang ligtas na susunod na hakbang?',key:1,correct:'Report location, need and action taken; record the time.'},
];
let db;

async function setup() {
  db = new PGlite();
  await db.exec(`create table public.courses(id uuid primary key default gen_random_uuid(), title_en text, title_fil text, status text);
    create table public.course_test_questions(id uuid primary key default gen_random_uuid(), course_id uuid,
      position integer, module_position integer, prompt_en text, prompt_fil text, options jsonb,
      correct_option_index integer, retired_at timestamptz);
    create unique index course_test_questions_active_position_key on public.course_test_questions(course_id,position)
      where retired_at is null;
    create view public.course_test_questions_current as select * from public.course_test_questions where retired_at is null;
    create table public.assessor_exam_snapshots(question_ids uuid[], score_percent numeric);
    insert into public.courses(title_en,title_fil,status)
      values('The BHW as First Responder','Ang BHW Bilang First Responder','published');`);
  for (let position = 0; position < 14; position++) {
    const item = old.find(row => row.position === position);
    const options = [{en:'Other choice',fil:'Ibang sagot'},{en:'Another choice',fil:'Isa pang sagot'},{en:'Third choice',fil:'Ikatlong sagot'}];
    if (item) options[item.key].en = item.correct;
    await db.query(`insert into public.course_test_questions(course_id,position,module_position,prompt_en,prompt_fil,options,correct_option_index)
      select id,$1,$2,$3,$4,$5::jsonb,$6 from public.courses`,
    [position,item?.module ?? 0,item?.prompt_en ?? `Other question ${position}`,item?.prompt_fil ?? `Ibang tanong ${position}`,JSON.stringify(options),item?.key ?? 0]);
  }
  await db.exec(`insert into public.assessor_exam_snapshots(question_ids,score_percent)
    select array_agg(id order by position),80 from public.course_test_questions`);
}
afterEach(async () => {await db?.close();db=undefined;});

describe('Chapter II diagnostic context revision', () => {
  it('adds pre-study situations while preserving keys, options and historical snapshots', async () => {
    await setup();
    const before = (await db.query('select * from public.course_test_questions_current order by position')).rows;
    const snapshot = (await db.query('select * from public.assessor_exam_snapshots')).rows[0];
    await db.exec(migration);
    const active = (await db.query('select * from public.course_test_questions_current order by position')).rows;
    expect(active).toHaveLength(14);
    for (const position of [10,12,13]) {
      expect(active[position].id).not.toBe(before[position].id);
      expect(active[position].prompt_en.length).toBeGreaterThan(before[position].prompt_en.length);
      expect(active[position].prompt_fil.length).toBeGreaterThan(before[position].prompt_fil.length);
      expect(active[position].module_position).toBe(before[position].module_position);
      expect(active[position].options).toEqual(before[position].options);
      expect(active[position].correct_option_index).toBe(before[position].correct_option_index);
    }
    for (const position of [0,1,2,3,4,5,6,7,8,9,11]) expect(active[position].id).toBe(before[position].id);
    expect(active[10].prompt_en).toContain('schedule change');
    expect(active[12].prompt_en).toContain('flood exercise');
    expect(active[13].prompt_en).toContain('After flooding');
    expect(new Set(active.map(row => row.prompt_en))).toHaveProperty('size',14);
    expect(new Set(active.map(row => row.prompt_fil))).toHaveProperty('size',14);
    expect((await db.query('select count(*)::integer as n from public.course_test_questions where retired_at is not null')).rows[0].n).toBe(3);
    expect((await db.query('select * from public.assessor_exam_snapshots')).rows[0]).toEqual(snapshot);
  });

  it('rejects drift without retiring any question', async () => {
    await setup();
    await db.exec("update public.course_test_questions set prompt_en='Changed externally' where position=12");
    await expect(db.exec(migration)).rejects.toThrow(/changed; review before replacing/);
    expect((await db.query('select count(*)::integer as n from public.course_test_questions_current')).rows[0].n).toBe(14);
    expect((await db.query('select count(*)::integer as n from public.course_test_questions where retired_at is not null')).rows[0].n).toBe(0);
  });
});
