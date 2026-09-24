// Facilitator guide migration (20260926000000_facilitator_guide.sql):
// barangay-wide progress reads for facilitators and recorded competency
// observations. Run by training-foundation-replay.mjs after the foundation
// scenarios, against the same disposable database and seeded fixture.
import assert from 'node:assert/strict';

export async function runFacilitatorGuideScenarios(db,fixture){
  const {users,course,module}=fixture;const checks=[];
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
  const record='select public.rpc_competency_observation_record($1,$2,$3,$4,$5) id';
  const indicator={objective_index:0,observable_fil:'Nakikita',observable_en:'Observable',not_yet_fil:'Hindi pa',not_yet_en:'Not yet',
    levels:{kaya_na_fil:'a',kaya_na_en:'a',kailangan_practice_fil:'b',kailangan_practice_en:'b',hindi_pa_fil:'c',hindi_pa_en:'c'}};
  await db.query('insert into course_module_facilitator_notes(module_id,notes_fil,notes_en,competency_statement_fil,competency_statement_en,observation_indicators) values($1,$2,$2,$3,$3,$4)',
    [module,'Tala','Competency',JSON.stringify([indicator])]);

  await check('facilitator reads progress for every BHW in their area, not only enrolled ones',async()=>{
    const {rows}=await q(users.facilitator,'select bhw_user_id from course_progress where course_id=$1',[course]);
    const seen=new Set(rows.map(r=>r.bhw_user_id));
    for(const name of ['partial','complete','certified'])assert.ok(seen.has(users[name].id),name);
    assert.ok(!seen.has(users.outside.id));
    const attempts=await q(users.facilitator,'select bhw_user_id from course_test_attempts where course_id=$1',[course]);
    assert.ok(attempts.rows.some(r=>r.bhw_user_id===users.partial.id));
  });
  await check('BHW still reads only their own progress',async()=>{
    const {rows}=await q(users.partial,'select bhw_user_id from course_progress where course_id=$1',[course]);
    assert.deepEqual([...new Set(rows.map(r=>r.bhw_user_id))],[users.partial.id]);
  });
  let first;
  await check('facilitator records an observation with an indicator snapshot and audit event',async()=>{
    first=(await q(users.facilitator,record,[users.partial.id,module,0,'hindi_pa',' needs a demo '])).rows[0].id;
    const {rows}=await q(users.facilitator,'select * from competency_observations where id=$1',[first]);
    assert.equal(rows[0].observer_user_id,users.facilitator.id);assert.equal(rows[0].note,'needs a demo');
    assert.equal(rows[0].indicator_snapshot.observable_en,'Observable');
    const audit=await db.query("select * from audit_events where event_type='competency.observed' and subject_id=$1",[users.partial.id]);
    assert.equal(audit.rows.length,1);assert.equal(audit.rows[0].metadata.observation_id,first);
  });
  await check('re-observation appends history; latest row is the current rating',async()=>{
    await new Promise(r=>setTimeout(r,5));
    await q(users.otherFacilitator,record,[users.partial.id,module,0,'kaya_na','']);
    const {rows}=await q(users.facilitator,'select level from competency_observations where bhw_user_id=$1 and module_id=$2 order by observed_at desc',[users.partial.id,module]);
    assert.deepEqual(rows.map(r=>r.level),['kaya_na','hindi_pa']);
  });
  await check('recording is rejected outside scope, for non-BHWs, inactive BHWs and bad input',async()=>{
    await reject(users.facilitator,record,[users.outside.id,module,0,'kaya_na','']);
    await reject(users.facilitator,record,[users.inactive.id,module,0,'kaya_na','']);
    await reject(users.facilitator,record,[users.otherFacilitator.id,module,0,'kaya_na','']);
    await reject(users.outsideAdmin,record,[users.partial.id,module,0,'kaya_na','']);
    await reject(users.partial,record,[users.complete.id,module,0,'kaya_na','']);
    await reject(users.facilitator,record,[users.partial.id,module,0,'excellent',''],/invalid level/);
    await reject(users.facilitator,record,[users.partial.id,module,5,'kaya_na',''],/indicator not found/);
    await reject(users.facilitator,record,[users.partial.id,module,0,'kaya_na','x'.repeat(1001)],/note too long/);
  });
  await check('observations are RPC-only and append-only',async()=>{
    await reject(users.facilitator,"insert into competency_observations(bhw_user_id,observer_user_id,org_unit_id,module_id,objective_index,indicator_snapshot,level) select $1,$2,org_unit_id,$3,0,'{}','kaya_na' from users where id=$1",[users.partial.id,users.facilitator.id,module]);
    await reject(users.admin,"update competency_observations set level='kaya_na' where id=$1",[first]);
    await reject(users.admin,'delete from competency_observations where id=$1',[first]);
  });
  await check('observation reads are scoped: in-scope admin yes, BHW and outside admin no',async()=>{
    assert.equal((await q(users.admin,'select id from competency_observations where id=$1',[first])).rows.length,1);
    assert.equal((await q(users.outsideAdmin,'select id from competency_observations where id=$1',[first])).rows.length,0);
    assert.equal((await q(users.partial,'select id from competency_observations')).rows.length,0);
  });
  return {checks:checks.length};
}
