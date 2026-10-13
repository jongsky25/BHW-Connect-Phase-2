// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';

const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const v={org:id(1),awayOrg:id(2),alex:id(3),other:id(4),maria:id(5),away:id(6),
  program:id(7),chapter:id(8),lesson:id(9),cohort:id(10),source:id(11),retry:id(12),
  cancelledSource:id(14)};
let db;
async function as(actor,query,args=[]){
  await db.exec('begin');
  try{
    await db.exec(`set local role ${actor?'authenticated':'anon'}`);
    await db.query("select set_config('test.actor',$1,true)",[actor??'']);
    const result=await db.query(query,args);
    await db.exec('commit');return result.rows[0]?.result;
  }catch(error){await db.exec('rollback');throw error;}
}
const create=(actor,overrides={})=>{
  const p={request:id(100),source:v.source,action:'observation',assignee:v.alex,date:null,...overrides};
  return as(actor,'select rpc_assessor_practice_followup_create($1,$2,$3,$4,$5) result',
    [p.request,p.source,p.action,p.assignee,p.date]);
};
const update=(actor,followup,overrides={})=>{
  const p={request:id(101),status:'open',assignee:v.alex,date:null,retry:null,note:null,...overrides};
  return as(actor,'select rpc_assessor_practice_followup_update($1,$2,$3,$4,$5,$6,$7) result',
    [p.request,followup,p.status,p.assignee,p.date,p.retry,p.note]);
};

beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`
    create role authenticated;create role anon;create schema assessor_rollout_private;
    grant usage on schema assessor_rollout_private to authenticated;
    create table org_units(id uuid primary key,path text);
    create table users(id uuid primary key,role text,status text,org_unit_id uuid,full_name text);
    create function current_app_user() returns users language sql stable security definer set search_path=public as $$
      select u from users u where u.id::text=nullif(current_setting('test.actor',true),'') $$;
    create function current_org_path() returns text language sql stable security definer set search_path=public as $$
      select o.path from org_units o join users u on u.org_unit_id=o.id
      where u.id::text=nullif(current_setting('test.actor',true),'') $$;
    create function org_unit_path(p_id uuid) returns text language sql stable security definer set search_path=public as $$
      select path from org_units where id=p_id $$;
    create table super_admin_personas(persona_user_id uuid);
    create table training_programs(id uuid primary key,content_key text,status text);
    create table training_program_chapters(id uuid primary key,program_id uuid,chapter_key text,availability text);
    create table course_lessons(id uuid primary key,lesson_key text);
    create table feature_flags(key text,enabled boolean,disabled_roles text[]);
    create table assessor_flow_cohorts(id uuid primary key,program_id uuid,chapter_key text,
      ui_enabled boolean,writes_enabled boolean,authority_cutover_at timestamptz);
    create table assessor_flow_cohort_members(cohort_id uuid,user_id uuid);
    create table assessor_rollout_private.award_contracts(requirements_version text primary key,
      rubric_version text,enabled boolean);
    create table assessor_rollout_private.chapter_awards(actor_id uuid,chapter_id uuid,
      requirements_version text,status text);
    create table assessor_rollout_private.practice_attempts(id uuid primary key,program_id uuid,
      chapter_id uuid,lesson_id uuid,criterion_id text,requirements_version text,rubric_version text,
      bhw_user_id uuid,observer_user_id uuid,feedback_released_at timestamptz,feedback text,
      next_step text,sufficiency text,private_notes text,recorded_at timestamptz default clock_timestamp());
    create table notifications(id uuid primary key default gen_random_uuid(),recipient_user_id uuid,
      notification_type text constraint notifications_notification_type_check check(notification_type in
        ('announcement.created','survey.published','course.published','assessment.decided',
        'forum.reply','flipchart.reviewed','user.transferred','course_session.enrolled','feedback.reply')),
      subject_type text,subject_id uuid,title_fil text,title_en text,body_fil text,body_en text,link_path text);
  `);
  await db.query('insert into org_units values($1,$2),($3,$4)',[v.org,'city.',v.awayOrg,'away.']);
  for(const [person,role,org,name] of [[v.alex,'assessor',v.org,'Alex'],[v.other,'assessor',v.org,'Other'],
    [v.maria,'bhw',v.org,'Maria'],[v.away,'bhw',v.awayOrg,'Away']])
    await db.query('insert into users values($1,$2,$3,$4,$5)',[person,role,'active',org,name]);
  await db.query("insert into training_programs values($1,'bhw-reference-manual','published')",[v.program]);
  await db.query("insert into training_program_chapters values($1,$2,'chapter-1','available')",[v.chapter,v.program]);
  await db.query("insert into course_lessons values($1,'communication-clarify')",[v.lesson]);
  await db.query("insert into assessor_flow_cohorts values($1,$2,'chapter-1',true,false,null)",[v.cohort,v.program]);
  await db.query('insert into assessor_flow_cohort_members values($1,$2),($1,$3),($1,$4)',
    [v.cohort,v.alex,v.other,v.maria]);
  await db.query("insert into feature_flags values('elearning',true,'{}'),('assessor_flow_ui',true,'{}'),('assessor_flow_writes',false,'{}')");
  await db.query("insert into assessor_rollout_private.award_contracts values('req1','rubric1',true)");
  await db.query("insert into assessor_rollout_private.chapter_awards values($1,$3,'req1','active'),($2,$3,'req1','active')",
    [v.alex,v.other,v.chapter]);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261013132513_c1af15_feedback_followup.sql',import.meta.url),'utf8'));
  await db.query(`insert into assessor_rollout_private.practice_attempts values
    ($1,$2,$3,$4,'clarify','req1','rubric1',$5,$6,null,'Hidden feedback','Next practice','insufficient','SECRET',clock_timestamp())`,
    [v.source,v.program,v.chapter,v.lesson,v.maria,v.alex]);
},30000);
afterAll(async()=>db?.close());

describe('C1AF-15 practice follow-up boundary',()=>{
  it('keeps follow-up writes closed and private feedback invisible',async()=>{
    await expect(create(v.alex)).rejects.toThrow(/unavailable/);
    await expect(as(v.alex,'select count(*) from assessor_rollout_private.practice_followups')).rejects.toThrow(/permission denied/);
    expect(await as(v.maria,'select rpc_bhw_practice_feedback($1) result',[v.program])).toEqual([]);
    expect((await db.query("select count(*)::int n from notifications")).rows[0].n).toBe(0);
    await db.query("update feature_flags set enabled=true where key='assessor_flow_writes'");
    await db.query('update assessor_flow_cohorts set writes_enabled=true,authority_cutover_at=now() where id=$1',[v.cohort]);
  });
  it('requires the source observer and an eligible assignee, and deduplicates a plan',async()=>{
    await expect(create(null)).rejects.toThrow();
    await expect(create(v.other)).rejects.toThrow(/unavailable/);
    await expect(create(v.alex,{assignee:v.away})).rejects.toThrow(/unavailable/);
    const plan=await create(v.alex);
    expect(await create(v.alex)).toBe(plan);
    await expect(create(v.alex,{action:'practice'})).rejects.toThrow(/request ID reused/);
  });
  it('reassigns, marks overdue, and links a later attempt without replacing evidence',async()=>{
    const plan=await create(v.alex);
    await update(v.alex,plan,{assignee:v.other});
    await expect(update(v.away,plan,{request:id(102),status:'cancelled',assignee:v.other})).rejects.toThrow();
    await db.query(`insert into assessor_rollout_private.practice_attempts values
      ($1,$2,$3,$4,'clarify','req1','rubric1',$5,$6,null,'','Retry','sufficient','SECRET',clock_timestamp())`,
      [v.retry,v.program,v.chapter,v.lesson,v.maria,v.other]);
    await update(v.other,plan,{request:id(103),status:'completed',assignee:v.other,retry:v.retry});
    expect(await update(v.other,plan,{request:id(103),status:'completed',assignee:v.other,retry:v.retry})).toBe(plan);
    await expect(update(v.other,plan,{request:id(104),status:'cancelled',assignee:v.other})).rejects.toThrow(/already closed/);
    const state=await as(v.other,'select rpc_assessor_practice_followup_state($1,$2) result',[v.program,v.maria]);
    expect(state.followups).toMatchObject([{id:plan,status:'completed',retryAttemptId:v.retry}]);
    expect((await db.query('select count(*)::int n from assessor_rollout_private.practice_attempts')).rows[0].n).toBe(2);
  });
  it('shows overdue work and retains a cancelled plan without a retry',async()=>{
    await db.query(`insert into assessor_rollout_private.practice_attempts values
      ($1,$2,$3,$4,'clarify','req1','rubric1',$5,$6,null,'','Practice again','insufficient','SECRET',clock_timestamp())`,
      [v.cancelledSource,v.program,v.chapter,v.lesson,v.maria,v.alex]);
    const plan=await create(v.alex,{request:id(105),source:v.cancelledSource,
      date:new Date(Date.now()+86400000).toISOString()});
    await db.query('update assessor_rollout_private.practice_followups set agreed_at=now()-interval \'1 day\' where id=$1',[plan]);
    const state=await as(v.alex,'select rpc_assessor_practice_followup_state($1,$2) result',[v.program,v.maria]);
    expect(state.followups.find(item=>item.id===plan)).toMatchObject({status:'open',assignedTo:v.alex});
    expect(Date.parse(state.followups.find(item=>item.id===plan).agreedAt)).toBeLessThan(Date.now());
    await update(v.alex,plan,{request:id(106),status:'cancelled'});
    const closed=await as(v.alex,'select rpc_assessor_practice_followup_state($1,$2) result',[v.program,v.maria]);
    expect(closed.followups.find(item=>item.id===plan)).toMatchObject({status:'cancelled',retryAttemptId:null});
  });
  it('notifies once per released attempt and never projects private notes',async()=>{
    const released=id(13);
    await db.query(`insert into assessor_rollout_private.practice_attempts values
      ($1,$2,$3,$4,'clarify','req1','rubric1',$5,$6,now(),'Clear confirmation','Try again','sufficient','SECRET',clock_timestamp())`,
      [released,v.program,v.chapter,v.lesson,v.maria,v.alex]);
    const rows=(await db.query("select recipient_user_id,subject_id,notification_type from notifications")).rows;
    expect(rows).toMatchObject([{recipient_user_id:v.maria,subject_id:released,notification_type:'practice.feedback_released'}]);
    await create(v.alex,{request:id(107),source:released,action:'practice'});
    const mine=await as(v.maria,'select rpc_bhw_practice_feedback($1) result',[v.program]);
    expect(mine).toMatchObject([{id:released,feedback:'Clear confirmation',nextStep:'Try again',
      followup:{action:'practice',assignedName:'Alex',status:'open'}}]);
    expect(JSON.stringify(mine)).not.toContain('SECRET');
    expect(JSON.stringify(mine)).not.toContain(v.source);
    expect(await as(v.away,'select rpc_bhw_practice_feedback($1) result',[v.program])).toEqual([]);
  });
});
