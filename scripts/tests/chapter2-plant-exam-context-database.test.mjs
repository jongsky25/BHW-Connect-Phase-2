// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('../../supabase/migrations/20261026095241_chapter2_exam_plant_context.sql', import.meta.url), 'utf8');
let db;

beforeAll(async () => {
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
    const prompt = position === 8 ? 'What follows the card check?'
      : position === 9 ? 'What is the safe response in the Niyog-niyogan case?' : `Question ${position}`;
    const correct = position === 8 ? 'Consult a clinician.'
      : position === 9 ? 'Consult a clinician first.' : 'Correct';
    await db.query(`insert into public.course_test_questions(course_id,position,module_position,prompt_en,prompt_fil,options,correct_option_index)
      select id,$1,$2,$3,'Lumang tanong',$4::jsonb,2 from public.courses`,
    [position, position === 8 || position === 9 ? 4 : 3, prompt,
      JSON.stringify([{en:'Wrong',fil:'Mali'},{en:'Also wrong',fil:'Mali rin'},{en:correct,fil:'Tama'}])]);
  }
  await db.exec(`insert into public.assessor_exam_snapshots(question_ids,score_percent)
    select array_agg(id order by position),80 from public.course_test_questions`);
});
afterAll(async () => { await db?.close(); });

describe('Chapter II plant exam context revision', () => {
  it('replaces only the two vague questions and preserves historical attempt identities', async () => {
    const old = (await db.query('select id from public.course_test_questions where position=8')).rows[0].id;
    const snapshot = (await db.query('select * from public.assessor_exam_snapshots')).rows[0];
    await db.exec(migration);
    const active = (await db.query('select * from public.course_test_questions_current order by position')).rows;
    expect(active).toHaveLength(14);
    expect(active[8].id).not.toBe(old);
    expect(active[8].prompt_en).toContain('tsaang gubat');
    expect(active[9].prompt_en).toContain('child');
    expect(active[8].options[2].en).toContain('symptoms and medicines');
    expect(active[9].options[2].en).toContain('health center for diagnosis');
    for (const position of [8, 9]) {
      expect(active[position].prompt_fil.length).toBeGreaterThan(80);
      expect(active[position].options[2].fil.length).toBeGreaterThan(30);
      expect(active[position].correct_option_index).toBe(2);
    }
    expect((await db.query('select count(*)::integer as n from public.course_test_questions where retired_at is not null')).rows[0].n).toBe(2);
    expect((await db.query('select * from public.assessor_exam_snapshots')).rows[0]).toEqual(snapshot);
    expect((await db.query('select id from public.course_test_questions where id=$1', [old])).rows).toHaveLength(1);
  });
});
