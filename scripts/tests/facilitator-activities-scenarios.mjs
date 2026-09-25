import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadTrainingCourse} from '../lib/training-content.mjs';

export async function runActivityScenarios(db,fixture) {
  const {users,module,otherModule,course,org}=fixture;
  const checks=[];
  const cards=loadTrainingCourse('day1-basic-competencies').modules[0].facilitatorNotes.activities;
  const game={...cards[0],id:'test-game',kind:'game',objective_indices:[]};
  await db.query(`insert into course_module_facilitator_notes(module_id,activities,observation_indicators)
    values($1,$2,$3) on conflict(module_id) do update set activities=excluded.activities,observation_indicators=excluded.observation_indicators`,
    [module,JSON.stringify([...cards,game]),JSON.stringify([0,1,2].map(objective_index=>({objective_index,observable_en:'Demonstrates role',observable_fil:'Ipinapakita ang papel'})))]);
  const session=randomUUID();
  await db.query('insert into course_sessions(id,course_id,org_unit_id,facilitator_user_id,scheduled_at) values($1,$2,$3,$4,now())',[session,course,org.city,users.facilitator.id]);
  async function q(user,sql,args=[]) {
    await db.query('begin');
    try {await db.query(user?'set local role authenticated':'set local role anon');
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user?.auth??'']);
      const r=await db.query(sql,args);await db.query('commit');return r;
    } catch(e){await db.query('rollback');throw e;}
  }
  const log='select public.rpc_course_session_activity_record($1,$2,$3,$4,$5,$6,$7) id';
  const args=[session,module,cards[0].id,1,'planned',null,''];
  const observe='select public.rpc_competency_observation_record_activity($1,$2,$3,$4,$5,$6,$7) id';
  const obsArgs=[users.new.id,module,0,'kaya_na',cards[0].id,1,'Observed independently'];
  const snapshot=async()=>{const s={};for(const t of ['course_progress','course_module_progress','assessments','certificates','course_session_deliveries'])s[t]=(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') v from ${t} t`)).rows[0].v;return s;};
  const before=await snapshot();
  const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
  await check('only the session owner can write; anonymous, BHW, other facilitator and admin cannot',async()=>{
    for(const u of [null,users.new,users.otherFacilitator,users.admin])await assert.rejects(()=>q(u,log,args),/not authorized|permission denied/);
  });
  await check('selected plan updates idempotently into run, adapted and skipped records',async()=>{
    const id=(await q(users.facilitator,log,args)).rows[0].id;
    for(const status of ['run','adapted','skipped'])assert.equal((await q(users.facilitator,log,[...args.slice(0,4),status,15,'Pairs used'])).rows[0].id,id);
    const r=(await q(users.facilitator,'select * from course_session_activities where id=$1',[id])).rows[0];
    assert.equal(r.status,'skipped');assert.equal(r.note,'Pairs used');assert.deepEqual(r.activity_snapshot,cards[0]);
  });
  await check('scope hides activity records and guide cards from learners and outside admins',async()=>{
    for(const u of [users.new,users.outsideAdmin]){
      assert.equal((await q(u,'select * from course_session_activities where session_id=$1',[session])).rowCount,0);
      assert.equal((await q(u,'select activities from course_module_facilitator_notes where module_id=$1',[module])).rowCount,0);
    }
    assert.equal((await q(users.admin,'select * from course_session_activities where session_id=$1',[session])).rowCount,1);
    await assert.rejects(()=>q(users.facilitator,"update course_session_activities set status='run'"),/permission denied/);
  });
  await check('unknown activity, wrong module/version/status/duration and long notes reject',async()=>{
    const cases=[[1,otherModule],[2,'missing'],[3,999],[4,'complete'],[5,0],[5,601],[6,'x'.repeat(1001)]];
    for(const [i,value]of cases){const a=[...args];a[i]=value;await assert.rejects(()=>q(users.facilitator,log,a));}
  });
  await check('activity observation snapshots evidence and rejects unsuitable games or indicators',async()=>{
    const id=(await q(users.facilitator,observe,obsArgs)).rows[0].id;
    assert.deepEqual((await db.query('select activity_snapshot from competency_observations where id=$1',[id])).rows[0].activity_snapshot,cards[0]);
    for(const [i,value]of [[2,1],[4,game.id],[5,99],[0,users.outside.id]]){
      const a=[...obsArgs];a[i]=value;await assert.rejects(()=>q(users.facilitator,observe,a));
    }
    await assert.rejects(()=>q(users.new,observe,obsArgs),/not authorized/);
    assert.equal((await db.query('select count(*)::integer n from competency_observations where bhw_user_id=$1 and module_id=$2',[users.new.id,module])).rows[0].n,1);
  });
  await check('existing observation RPC remains available without an activity',async()=>{
    const id=(await q(users.facilitator,'select rpc_competency_observation_record($1,$2,0,\'kailangan_practice\',\'Other evidence\') id',[users.partial.id,module])).rows[0].id;
    assert.equal((await db.query('select activity_snapshot from competency_observations where id=$1',[id])).rows[0].activity_snapshot,null);
  });
  await check('closed sessions reject writes and historical snapshots survive content edits',async()=>{
    await db.query("update course_sessions set status='completed' where id=$1",[session]);
    await assert.rejects(()=>q(users.facilitator,log,args),/no longer scheduled/);
    await db.query("update course_module_facilitator_notes set activities='[]' where module_id=$1",[module]);
    assert.deepEqual((await db.query('select activity_snapshot from course_session_activities where session_id=$1',[session])).rows[0].activity_snapshot,cards[0]);
  });
  await check('activity records do not change progress, final assessment, certificates or delivery completion',async()=>assert.deepEqual(await snapshot(),before));
  return checks;
}
