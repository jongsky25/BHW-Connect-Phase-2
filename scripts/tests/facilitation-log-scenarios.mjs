// Facilitation log migration (20260927000000_facilitation_log.sql):
// attendance, subchapter deliveries and session completion. Run by
// training-foundation-replay.mjs against the seeded fixture, whose one
// session is run by `facilitator` with `new` and `partial` enrolled.
import assert from 'node:assert/strict';

export async function runFacilitationLogScenarios(db,fixture){
  const {users,module,otherModule,course}=fixture;const checks=[];
  async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
  async function q(user,sql,params=[]){
    await db.query('begin');
    try{
      await db.query('set local role authenticated');
      await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[user.auth]);
      const result=await db.query(sql,params);await db.query('commit');return result;
    }catch(e){await db.query('rollback');throw e;}
  }
  const reject=(user,sql,params,pattern=/not authorized|permission denied|row-level security/)=>assert.rejects(()=>q(user,sql,params),pattern);
  const session=(await db.query('select id from course_sessions where facilitator_user_id=$1 and course_id=$2 order by created_at limit 1',[users.facilitator.id,course])).rows[0].id;
  const attend='select public.rpc_course_session_set_attendance($1,$2,$3)';
  const log='select public.rpc_course_session_log_delivery($1,$2,$3,$4) id';
  const complete='select public.rpc_course_session_complete($1)';

  await check('only the session facilitator can mark attendance, log or complete',async()=>{
    for(const user of [users.otherFacilitator,users.admin,users.partial]){
      await reject(user,attend,[session,users.partial.id,'attended']);
      await reject(user,log,[session,module,60,'']);
      await reject(user,complete,[session]);
    }
  });
  await check('completion requires a logged subchapter and every attendance marked',async()=>{
    await reject(users.facilitator,complete,[session],/log at least one subchapter/);
    await q(users.facilitator,log,[session,module,90,' Ran the opening activity ']);
    await reject(users.facilitator,complete,[session],/attendance incomplete/);
    await q(users.facilitator,attend,[session,users.partial.id,'attended']);
    await reject(users.facilitator,complete,[session],/attendance incomplete/);
  });
  await check('attendance and delivery input is validated',async()=>{
    await reject(users.facilitator,attend,[session,users.partial.id,'late'],/invalid attendance status/);
    await reject(users.facilitator,attend,[session,users.complete.id,'attended'],/not enrolled in this session/);
    await reject(users.facilitator,log,[session,module,0,''],/invalid duration/);
    await reject(users.facilitator,log,[session,module,601,''],/invalid duration/);
    await reject(users.facilitator,log,[session,module,30,'x'.repeat(2001)],/notes too long/);
    const foreign=(await db.query("select id from course_modules where course_id<>$1 limit 1",[course])).rows[0]?.id;
    if(foreign)await reject(users.facilitator,log,[session,foreign,30,''],/module not found/);
  });
  await check('logging a subchapter again corrects it; rows are RPC-only',async()=>{
    await q(users.facilitator,log,[session,module,120,'Full module']);
    await q(users.facilitator,log,[session,otherModule,45,'']);
    const {rows}=await q(users.facilitator,'select module_id,duration_minutes,notes from course_session_deliveries where session_id=$1 order by duration_minutes',[session]);
    assert.deepEqual(rows.map(r=>[r.module_id,r.duration_minutes,r.notes]),[[otherModule,45,''],[module,120,'Full module']]);
    await reject(users.facilitator,"insert into course_session_deliveries(session_id,module_id,duration_minutes,recorded_by) values($1,$2,10,$3)",[session,module,users.facilitator.id]);
    await reject(users.facilitator,'update course_session_deliveries set duration_minutes=1 where session_id=$1',[session]);
  });
  await check('facilitator completes the session; it is then closed to edits',async()=>{
    await q(users.facilitator,attend,[session,users.new.id,'no_show']);
    await q(users.facilitator,complete,[session]);
    assert.equal((await db.query('select status from course_sessions where id=$1',[session])).rows[0].status,'completed');
    await reject(users.facilitator,attend,[session,users.new.id,'attended'],/session is no longer scheduled/);
    await reject(users.facilitator,log,[session,module,30,''],/session is no longer scheduled/);
    const audit=await db.query("select event_type from audit_events where subject_id=$1 and event_type like 'course_session.%' order by created_at",[session]);
    assert.ok(['course_session.attendance','course_session.delivery_logged','course_session.completed'].every(t=>audit.rows.some(r=>r.event_type===t)));
  });
  await check('deliveries are visible across the area, not to BHWs or outside admins',async()=>{
    assert.equal((await q(users.otherFacilitator,'select id from course_session_deliveries where session_id=$1',[session])).rows.length,2);
    assert.equal((await q(users.admin,'select id from course_session_deliveries where session_id=$1',[session])).rows.length,2);
    assert.equal((await q(users.outsideAdmin,'select id from course_session_deliveries')).rows.length,0);
    assert.equal((await q(users.partial,'select id from course_session_deliveries')).rows.length,0);
  });
  return {checks:checks.length};
}
