// PSGC org hierarchy + assessor catchment + BHW barangay selection
// (20261002000000_psgc_org_units.sql, 20261002000100_assessor_catchment_bhw_barangay.sql).
// Run by training-foundation-replay.mjs after the other scenarios, against the
// same disposable database and seeded fixture.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

const PILOT = {region:'00000000-0000-0000-0000-000000000002',province:'00000000-0000-0000-0000-000000000003',
  city:'00000000-0000-0000-0000-000000000004',batongMalake:'00000000-0000-0000-0000-000000000005'};

export async function runPsgcCatchmentScenarios(db,fixture){
  const {org,users,course}=fixture;const checks=[];
  async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
  async function q(user,sql,params=[]){
    await db.query('begin');
    try{
      await db.query('set local role authenticated');
      await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[user.auth]);
      const result=await db.query(sql,params);await db.query('commit');return result;
    }catch(e){await db.query('rollback');throw e;}
  }
  async function user(name,role,orgUnit){
    const id=randomUUID(),auth=randomUUID();await db.query('insert into auth.users(id) values($1)',[auth]);
    await db.query("insert into users(id,auth_user_id,username,full_name,role,org_unit_id,status) values($1,$2,$3,$4,$5,$6,'active')",[id,auth,`psgc.${name}`,name,role,orgUnit]);
    return {id,auth};
  }
  const psgc=async code=>(await db.query('select id from org_units where psgc_code=$1',[code])).rows[0].id;

  await check('PSGC tree is loaded under the national root with consistent codes and paths',async()=>{
    const {rows}=await db.query("select level,count(*)::int n from org_units where psgc_code is not null group by level");
    const n=Object.fromEntries(rows.map(r=>[r.level,r.n]));
    assert.equal(n.regional,18);assert.ok(n.provincial>=110);assert.ok(n.city_municipal>=1600);assert.ok(n.barangay>=41000);
    const bad=await db.query(`select count(*)::int n from org_units c join org_units p on p.id=c.parent_id
      where c.psgc_code is not null and (c.path <> p.path||c.id||'.'
        or (p.psgc_code is not null and left(c.psgc_code,length(p.psgc_code)) <> p.psgc_code))`);
    assert.equal(bad.rows[0].n,0);
    const roots=await db.query("select count(*)::int n from org_units r where r.level='regional' and r.psgc_code is not null and r.parent_id<>'00000000-0000-0000-0000-000000000001'");
    assert.equal(roots.rows[0].n,0);
  });
  await check('pilot units keep their UUIDs and gain PSGC identity',async()=>{
    const {rows}=await db.query('select id,psgc_code,name from org_units where id=any($1) order by psgc_code',[Object.values(PILOT)]);
    assert.deepEqual(rows.map(r=>r.psgc_code),['04','04034','0403411','0403411004']);
    const kids=await db.query("select count(*)::int n from org_units where parent_id=$1 and level='barangay'",[PILOT.city]);
    assert.equal(kids.rows[0].n,14);
  });

  await check('assessor must sit at region, province or city/municipality; BHW at city/municipality or barangay',async()=>{
    await assert.rejects(()=>user('brgyassessor','assessor',org.barangay),/assessor catchment/);
    await assert.rejects(()=>user('natassessor','assessor',org.national),/assessor catchment/);
    await assert.rejects(()=>user('provbhw','bhw',org.province),/bhw must belong to a barangay/);
    await user('regionassessor','assessor',org.region);
    await assert.rejects(()=>db.query('update users set org_unit_id=$1 where id=$2',[org.barangay,users.facilitator.id]),/assessor catchment/);
    // Unrelated updates to a pre-existing row are not re-checked.
    await db.query("update users set full_name=full_name where id=$1",[users.facilitator.id]);
  });

  const provincial=await user('provincialassessor','assessor',org.province);
  const elsewhere=await user('elsewhereassessor','assessor',await psgc('04034'));
  await check('provincial assessor sees a course published by a municipality in their catchment',async()=>{
    const {rows}=await q(provincial,'select id from courses where id=$1',[course]);
    assert.equal(rows.length,1);
    const modules=await q(provincial,'select id from course_modules where course_id=$1',[course]);
    assert.ok(modules.rows.length>=1);
    const outside=await q(elsewhere,'select id from courses where id=$1',[course]);
    assert.equal(outside.rows.length,0);
    const bhw=await q(users.outside,'select id from courses where id=$1',[course]);
    assert.equal(bhw.rows.length,0);
  });
  await check('provincial assessor can run a session for a course inside their catchment',async()=>{
    const {rows}=await q(provincial,"select session_id from rpc_course_session_create($1,now(),'Hall','normal')",[course]);
    assert.ok(rows[0].session_id);
    await assert.rejects(()=>q(elsewhere,"select session_id from rpc_course_session_create($1,now(),'Hall','normal')",[course]),/not authorized/);
  });

  await check('assessment queue follows the catchment: city and provincial assessors see and claim, outsiders do not',async()=>{
    const a1=randomUUID(),a2=randomUUID();
    await db.query("insert into assessments(id,course_id,bhw_user_id,org_unit_id,status) values($1,$2,$3,$4,'pending'),($5,$2,$6,$4,'pending')",
      [a1,course,users.new.id,org.barangay,a2,users.racer.id]);
    for(const who of [users.facilitator,provincial]){
      const {rows}=await q(who,'select id from assessments where id=any($1)',[[a1,a2]]);
      assert.equal(rows.length,2);
    }
    assert.equal((await q(elsewhere,'select id from assessments where id=$1',[a1])).rows.length,0);
    await assert.rejects(()=>q(elsewhere,'select rpc_assessment_claim($1)',[a1]),/not authorized/);
    await q(provincial,'select rpc_assessment_claim($1)',[a1]);
    await q(users.facilitator,'select rpc_assessment_claim($1)',[a2]);
    const claimed=await db.query('select assessor_user_id from assessments where id=$1',[a1]);
    assert.equal(claimed.rows[0].assessor_user_id,provincial.id);
    const admin=await q(users.admin,'select id from assessments where id=any($1)',[[a1,a2]]);
    assert.equal(admin.rows.length,2);
  });

  await check('BHW provisioned at a municipality picks a barangay inside it, once',async()=>{
    const pending=await user('pendingbhw','bhw',org.city);
    await assert.rejects(()=>q(pending,'select rpc_bhw_select_barangay($1)',[org.otherBarangay]),/out of scope/);
    await assert.rejects(()=>q(pending,'select rpc_bhw_select_barangay($1)',[org.city]),/not a barangay/);
    await q(pending,'select rpc_bhw_select_barangay($1)',[org.barangay]);
    const {rows}=await db.query('select org_unit_id from users where id=$1',[pending.id]);
    assert.equal(rows[0].org_unit_id,org.barangay);
    const audit=await db.query("select count(*)::int n from audit_events where event_type='user.barangay_selected' and subject_id=$1",[pending.id]);
    assert.equal(audit.rows[0].n,1);
    await assert.rejects(()=>q(pending,'select rpc_bhw_select_barangay($1)',[org.barangay]),/barangay already set/);
    await assert.rejects(()=>q(provincial,'select rpc_bhw_select_barangay($1)',[org.barangay]),/not authorized/);
  });
  await check('a municipal BHW reads the PSGC barangays under their municipality to choose from',async()=>{
    const pending=await user('pilotbhw','bhw',PILOT.city);
    const {rows}=await q(pending,"select id from org_units where parent_id=$1 and level='barangay'",[PILOT.city]);
    assert.equal(rows.length,14);
    const other=await q(pending,"select id from org_units where psgc_code='04034'");
    assert.equal(other.rows.length,0);
  });
  return {checks:checks.length};
}
