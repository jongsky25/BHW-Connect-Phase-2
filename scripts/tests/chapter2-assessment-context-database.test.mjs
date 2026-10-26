// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('../../supabase/migrations/20261026075150_chapter2_assessment_context_questions.sql', import.meta.url), 'utf8');
const oldPrompts = ['What should the practice show?', 'What should the practice show?', 'What is the safe next step?', 'What is the safe next step?'];
const oldAnswers = ['Give the location and observations.', 'Maintain pressure and call.',
  'Inform the lead, record handover, and follow up.', 'Inform the lead, record handover, and follow up.'];
const positions = [6, 7, 12, 13];
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
    const index = positions.indexOf(position);
    const answer = index < 0 ? 'Correct' : oldAnswers[index];
    await db.query(`insert into public.course_test_questions(course_id,position,module_position,prompt_en,prompt_fil,options,correct_option_index)
      select id,$1,$2,$3,'Lumang tanong',$4::jsonb,2 from public.courses`,
    [position, position < 8 ? 3 : 6, index < 0 ? `Question ${position}` : oldPrompts[index],
      JSON.stringify([{en:'Wrong',fil:'Mali'},{en:'Also wrong',fil:'Mali rin'},{en:answer,fil:'Tama'}])]);
  }
  await db.exec(`insert into public.assessor_exam_snapshots(question_ids,score_percent)
    select array_agg(id order by position),80 from public.course_test_questions`);
});
afterAll(async () => { await db?.close(); });

describe('Chapter II assessment bank revision', () => {
  it('serves four contextual bilingual replacements while keeping old attempt IDs and scores intact', async () => {
    const old = (await db.query('select id from public.course_test_questions where position=6')).rows[0].id;
    const originalSnapshot = (await db.query('select * from public.assessor_exam_snapshots')).rows[0];
    await db.exec(migration);
    const active = (await db.query('select position,id,prompt_en,prompt_fil,options,correct_option_index from public.course_test_questions_current order by position')).rows;
    expect(active).toHaveLength(14);
    expect(active[6].id).not.toBe(old);
    expect(active[6].prompt_en).toContain('bystander');
    for (const position of positions) {
      expect(active[position].prompt_en).not.toBe(oldPrompts[positions.indexOf(position)]);
      expect(active[position].prompt_fil.length).toBeGreaterThan(40);
      expect(active[position].options[active[position].correct_option_index].en.length).toBeGreaterThan(20);
    }
    expect(new Set(positions.map(position => active[position].prompt_en)).size).toBe(4);
    expect((await db.query('select count(*)::integer as n from public.course_test_questions where retired_at is not null')).rows[0].n).toBe(4);
    const snapshot = (await db.query('select * from public.assessor_exam_snapshots')).rows[0];
    expect(snapshot).toEqual(originalSnapshot);
    expect((await db.query('select id from public.course_test_questions where id=$1', [old])).rows).toHaveLength(1);
  });
});
