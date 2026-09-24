import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const historical=['courses','course_modules','course_progress','course_module_progress','assessments','certificates','course_test_attempts','course_sessions','course_session_enrollments'];
async function snapshot(db){const result={};for(const table of historical)result[table]=(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') value from public.${table} t`)).rows[0].value;return result;}
export async function seedLegacy(db){
  const org={};let parent=null;
  for(const [name,level] of [['national','national'],['region','regional'],['province','provincial'],['city','city_municipal'],['barangay','barangay']]){
    org[name]=randomUUID();await db.query('insert into org_units(id,name,level,parent_id,path) values($1,$2,$3,$4,\'\')',[org[name],name,level,parent]);parent=org[name];
  }
  org.otherCity=randomUUID();org.otherBarangay=randomUUID();
  await db.query("insert into org_units(id,name,level,parent_id,path) values($1,'Other city','city_municipal',$2,'')",[org.otherCity,org.province]);
  await db.query("insert into org_units(id,name,level,parent_id,path) values($1,'Other barangay','barangay',$2,'')",[org.otherBarangay,org.otherCity]);
  const users={};
  for(const [name,role,scope,status] of [
    ['admin','admin',org.city,'active'],['root','admin',org.national,'active'],['outsideAdmin','admin',org.otherCity,'active'],
    ['facilitator','assessor',org.city,'active'],['otherFacilitator','assessor',org.city,'active'],
    ['new','bhw',org.barangay,'active'],['partial','bhw',org.barangay,'active'],['complete','bhw',org.barangay,'active'],
    ['certified','bhw',org.barangay,'active'],['outside','bhw',org.otherBarangay,'active'],['inactive','bhw',org.barangay,'deactivated'],
    ['racer','bhw',org.barangay,'active']]){
    const id=randomUUID(),auth=randomUUID();await db.query('insert into auth.users(id) values($1)',[auth]);
    await db.query('insert into users(id,auth_user_id,username,full_name,role,org_unit_id,status) values($1,$2,$3,$4,$5,$6,$7)',[id,auth,`foundation.${name.toLowerCase()}`,name,role,scope,status]);users[name]={id,auth};
  }
  const course=randomUUID(),moduleId=randomUUID(),otherModule=randomUUID();
  await db.query("insert into courses(id,org_unit_id,author_user_id,title_fil,title_en,status) values($1,$2,$3,'Kabanata I','Chapter I','published')",[course,org.city,users.admin.id]);
  for(const [id,pos] of [[moduleId,0],[otherModule,1]])await db.query("insert into course_modules(id,course_id,position,type,title_fil,title_en,lesson) values($1,$2,$3,'text','Tungkulin','Roles',$4)",[id,course,pos,{sections:[{concept_ids:['m1.roles'],body_fil:'Orihinal',body_en:'Original'}]}]);
  const cp={};const oldTime='2026-09-01T02:00:00.000Z';
  for(const name of ['partial','complete','certified']){
    cp[name]=randomUUID();await db.query('insert into course_progress(id,course_id,bhw_user_id,status,content_completed_at) values($1,$2,$3,$4,$5)',[cp[name],course,users[name].id,name==='certified'?'certified':name==='complete'?'content_completed':'in_progress',name==='partial'?null:oldTime]);
    await db.query('insert into course_module_progress(course_progress_id,module_id,completed_at) values($1,$2,$3)',[cp[name],moduleId,name==='partial'?null:oldTime]);
    if(name!=='partial')await db.query('insert into course_module_progress(course_progress_id,module_id,completed_at) values($1,$2,$3)',[cp[name],otherModule,oldTime]);
  }
  const assessment=randomUUID();await db.query("insert into assessments(id,course_id,bhw_user_id,org_unit_id,status,assessor_user_id) values($1,$2,$3,$4,'passed',$5)",[assessment,course,users.certified.id,org.barangay,users.facilitator.id]);
  await db.query("insert into certificates(assessment_id,course_id,bhw_user_id,verification_code,bhw_full_name_snapshot,course_title_fil_snapshot,course_title_en_snapshot) values($1,$2,$3,'FOUNDATION','Certified BHW','Kabanata I','Chapter I')",[assessment,course,users.certified.id]);
  const session=randomUUID();await db.query("insert into course_sessions(id,course_id,org_unit_id,facilitator_user_id,scheduled_at) values($1,$2,$3,$4,now())",[session,course,org.city,users.facilitator.id]);
  for(const name of ['new','partial'])await db.query('insert into course_session_enrollments(session_id,bhw_user_id) values($1,$2)',[session,users[name].id]);
  await db.query("insert into course_test_attempts(course_id,bhw_user_id,session_id,phase,score_percent,answers) values($1,$2,$3,'pretest',50,'[]')",[course,users.partial.id,session]);
  return {org,users,course,module:moduleId,otherModule,cp,oldTime,before:await snapshot(db)};
}

export async function runScenarios(db,pg,config,fixture){
  const {users,org,course,module,otherModule,cp,oldTime,before}=fixture;const checks=[];
  async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
  async function as(user,fn,client=db){
    await client.query('begin');try{
      await client.query(user?'set local role authenticated':'set local role anon');
      await client.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",[user?.auth||'',user?'authenticated':'anon']);
      const result=await fn(client);await client.query('commit');return result;
    }catch(e){await client.query('rollback');throw e;}
  }
  const q=(user,sql,params=[])=>as(user,c=>c.query(sql,params));
  const reject=async(user,sql,params=[],pattern=/not authorized|permission denied|row-level security/)=>assert.rejects(()=>q(user,sql,params),pattern);
  let program,l1,l2,optional,r1,r2,ro,staged;
  const revisions=[];
  async function revision(lesson,key,text=key){
    const fields={id:'read-one',concept_ids:['m1.roles'],heading_fil:'Tungkulin',heading_en:'Roles',body_fil:text,body_en:text};
    const res=await q(users.admin,'insert into course_lesson_revisions(lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,created_by) values($1,$2,$3,$4,$5,$6,$7,$8) returning id',
      [lesson,key,randomUUID().replaceAll('-','').repeat(2),JSON.stringify([fields]),JSON.stringify([{id:'slide-one',concept_ids:['m1.roles'],heading_fil:'Tatlong papel',heading_en:'Three roles',display_fil:'Magturo. Mag-organisa. Gumabay.',display_en:'Teach. Organize. Guide.'}]),'[]','[]',users.admin.id]);
    const id=res.rows[0].id;await q(users.admin,'insert into course_lesson_facilitator_notes(revision_id,notes_fil,notes_en) values($1,$2,$2)',[id,'FACILITATOR SECRET']);revisions.push(id);return id;
  }
  await check('migration leaves every historical row and identity unchanged',async()=>assert.deepEqual(await snapshot(db),before));
  await check('scoped authoring and unavailable chapter constraints',async()=>{
    program=(await q(users.admin,"insert into training_programs(content_key,org_unit_id,author_user_id,title_fil,title_en,status) values('bhw-reference-manual',$1,$2,'Manwal','Manual','published') returning id",[org.city,users.admin.id])).rows[0].id;
    await q(users.admin,"insert into training_program_chapters(program_id,chapter_key,position,title_fil,title_en,course_id,availability) values($1,'chapter-i',0,'Kabanata I','Chapter I',$2,'available'),($1,'chapter-ii',1,'Kabanata II','Chapter II',null,'unavailable'),($1,'chapter-iii',2,'Kabanata III','Chapter III',null,'unavailable')",[program,course]);
    assert.equal((await q(users.new,'select * from training_program_chapters where program_id=$1',[program])).rowCount,3);
    await reject(users.admin,"update training_program_chapters set availability='available' where chapter_key='chapter-ii'",[],/check constraint/);
    await reject(users.outsideAdmin,"insert into training_programs(content_key,org_unit_id,author_user_id,title_fil,title_en) values('bad',$1,$2,'x','x')",[org.city,users.outsideAdmin.id]);
    for(const [key,pos,required] of [['roles-overview',0,true],['roles-practice',1,true],['roles-enrichment',2,false]]){
      const id=(await q(users.admin,'insert into course_lessons(module_id,lesson_key,position,title_fil,title_en,objectives_fil,objectives_en,required) values($1,$2,$3,$2,$2,$4,$4,$5) returning id',[module,key,pos,['Explain the roles'],required])).rows[0].id;
      if(pos===0)l1=id;else if(pos===1)l2=id;else optional=id;
    }
    r1=await revision(l1,'r1');r2=await revision(l2,'r1');ro=await revision(optional,'r1');
  });
  await check('staged content and facilitator material are not learner-readable',async()=>{
    assert.equal((await q(users.new,'select * from course_lessons')).rowCount,0);
    assert.equal((await q(users.new,'select * from course_lesson_revisions')).rowCount,0);
    assert.equal((await q(users.new,'select * from course_lesson_facilitator_notes')).rowCount,0);
    assert.equal((await q(users.facilitator,'select * from course_lesson_revisions')).rowCount,0);
    await reject(null,'select * from course_lesson_revisions');
  });
  await check('publication is complete, atomic, idempotent and administrator-scoped',async()=>{
    await reject(users.admin,'select rpc_course_lessons_publish($1,$2)',[module,[r1]],/every lesson/);
    await reject(users.admin,'select rpc_course_lessons_publish($1,$2)',[module,[r1,r1,ro]],/every lesson/);
    await reject(users.outsideAdmin,'select rpc_course_lessons_publish($1,$2)',[module,[r1,r2,ro]]);
    await reject(users.new,'select rpc_course_lessons_publish($1,$2)',[module,[r1,r2,ro]]);
    await q(users.admin,'select rpc_course_lessons_publish($1,$2)',[module,[r1,r2,ro]]);
    await q(users.admin,'select rpc_course_lessons_publish($1,$2)',[module,[r1,r2,ro]]);
    assert.equal((await db.query("select * from audit_events where event_type='course.lessons_published'")).rowCount,1);
    assert.equal((await q(users.new,'select * from course_lesson_revisions')).rowCount,3);
    assert.equal((await q(users.facilitator,'select * from course_lesson_facilitator_notes')).rowCount,3);
    assert.equal((await q(users.new,'select * from course_lesson_facilitator_notes')).rowCount,0);
    assert.equal((await q(users.outside,'select * from course_lesson_revisions')).rowCount,0);
    assert.equal((await q(users.inactive,'select * from course_lesson_revisions')).rowCount,0);
  });
  await check('published identities, revision payloads, and private notes resist direct mutation',async()=>{
    await reject(users.admin,'update course_lessons set published_revision_id=$1 where id=$2',[r2,l1]);
    await reject(users.admin,"update course_lesson_revisions set slides='[]' where id=$1",[r1]);
    await reject(users.admin,"update course_lesson_facilitator_notes set notes_en='changed' where revision_id=$1",[r1]);
    await reject(users.admin,"update course_lessons set lesson_key='changed' where id=$1",[l1]);
    await assert.rejects(()=>db.query('update course_lessons set published_revision_id=$1 where id=$2',[r2,l1]),/foreign key/);
  });
  await check('legacy whole-module endpoint cannot bypass released lessons',async()=>{
    await reject(users.partial,'select rpc_course_module_complete($1,$2)',[course,module],/required lessons/);
    assert.equal((await db.query('select * from course_module_progress where course_progress_id=$1 and completed_at is not null',[cp.partial])).rowCount,0);
  });
  await check('legacy equivalence requires reviewed matching content, with explicit dry-run',async()=>{
    const hash=(await q(users.admin,'select training_legacy_content_hash($1) hash',[module])).rows[0].hash;
    await reject(users.admin,'select rpc_course_lesson_approve_equivalence($1,$2,$3,$4)',[l1,r1,'0'.repeat(64),'review'],/legacy content changed/);
    for(const [l,r] of [[l1,r1],[l2,r2]])await q(users.admin,'select rpc_course_lesson_approve_equivalence($1,$2,$3,$4)',[l,r,hash,'Approved source coverage fixture']);
    await reject(users.new,'select rpc_course_lesson_backfill($1,$2,false)',[module,'test-batch']);
    const result=await q(users.admin,'select * from rpc_course_lesson_backfill($1,$2)',[module,'test-batch']);
    assert.equal(Number(result.rows[0].eligible),4);assert.equal(Number(result.rows[0].inserted),0);
    assert.equal((await db.query('select * from course_lesson_progress')).rowCount,0);
  });
  await check('idempotent backfill preserves original timestamps, certificates, attempts and incomplete rows',async()=>{
    const first=await q(users.admin,'select * from rpc_course_lesson_backfill($1,$2,false)',[module,'test-batch']);assert.equal(Number(first.rows[0].inserted),4);
    const second=await q(users.admin,'select * from rpc_course_lesson_backfill($1,$2,false)',[module,'test-batch']);assert.equal(Number(second.rows[0].inserted),0);
    const rows=(await db.query('select * from course_lesson_progress')).rows;
    assert.ok(rows.every(r=>r.completed_at.toISOString()===oldTime&&r.completion_basis==='legacy_equivalence'&&r.legacy_module_id===module&&r.migration_batch==='test-batch'));
    assert.equal((await db.query('select * from course_lesson_progress where course_progress_id=$1',[cp.partial])).rowCount,0);
    assert.deepEqual(await snapshot(db),before);
  });
  await check('resume validates stable position/concept and never infers completion',async()=>{
    await q(users.partial,'select rpc_course_lesson_resume($1,$2,\'read\',\'fil\',\'read-one\',\'m1.roles\')',[l1,r1]);
    await q(users.partial,'select rpc_course_lesson_resume($1,$2,\'slides\',\'en\',\'slide-one\',\'m1.roles\')',[l1,r1]);
    await reject(users.partial,'select rpc_course_lesson_resume($1,$2,\'read\',\'fil\',\'slide-one\',\'m1.roles\')',[l1,r1],/position and concept/);
    await reject(users.partial,'select rpc_course_lesson_resume($1,$2,\'read\',\'fil\',\'read-one\',\'invented\')',[l1,r1],/position and concept/);
    assert.equal((await q(users.partial,'select * from course_lesson_resume')).rowCount,2);
    assert.equal((await q(users.new,'select * from course_lesson_resume')).rowCount,0);
    assert.equal((await db.query('select * from course_lesson_progress where course_progress_id=$1',[cp.partial])).rowCount,0);
    // The old destructive reset now fails its FK rather than losing lesson state.
    await reject(users.admin,'select * from rpc_course_progress_reset($1,$2)',[course,users.partial.id],/foreign key/);
  });
  await check('completion is self-only, publication-scoped, and independent of mode',async()=>{
    for(const user of [users.outside,users.inactive,users.facilitator,null])await reject(user,'select rpc_course_lesson_complete($1,$2)',[l1,r1]);
    await reject(users.new,'insert into course_lesson_progress(course_progress_id,lesson_id,revision_id,completed_at,completion_basis) values($1,$2,$3,now(),\'learner\')',[cp.partial,l1,r1]);
    await q(users.new,'select rpc_course_lesson_complete($1,$2)',[l1,r1]);
    const first=(await q(users.new,'select * from course_lesson_progress')).rows[0];
    await q(users.new,'select rpc_course_lesson_complete($1,$2)',[l1,r1]);
    assert.deepEqual((await q(users.new,'select * from course_lesson_progress')).rows,[first]);
    assert.equal((await q(users.new,'select * from course_module_progress where module_id=$1 and completed_at is not null',[module])).rowCount,0);
    await q(users.new,'select rpc_course_lesson_complete($1,$2)',[l2,r2]);
    assert.equal((await q(users.new,'select * from course_module_progress where module_id=$1 and completed_at is not null',[module])).rowCount,1);
    assert.equal((await q(users.new,'select * from course_lesson_progress where lesson_id=$1',[optional])).rowCount,0);
  });
  await check('legacy unmapped module still works and the existing chapter transition runs once',async()=>{
    await q(users.new,'select rpc_course_module_complete($1,$2)',[course,otherModule]);
    await q(users.new,'select rpc_course_lesson_complete($1,$2)',[l2,r2]);
    const state=(await q(users.new,'select * from course_progress where course_id=$1',[course])).rows[0];assert.equal(state.status,'content_completed');
    assert.equal((await db.query('select * from assessments where bhw_user_id=$1 and course_id=$2',[users.new.id,course])).rowCount,1);
    assert.equal((await db.query('select * from certificates where bhw_user_id=$1',[users.new.id])).rowCount,0);
  });
  await check('reporting inherits scoped admins and session-owner facilitator access',async()=>{
    assert.equal((await q(users.facilitator,'select * from course_lesson_progress')).rowCount,2);
    assert.equal((await q(users.otherFacilitator,'select * from course_lesson_progress')).rowCount,0);
    assert.equal((await q(users.outsideAdmin,'select * from course_lesson_progress')).rowCount,0);
    assert.equal((await q(users.root,'select * from course_lesson_progress')).rowCount,6);
    assert.equal((await q(users.certified,'select * from course_lesson_progress')).rowCount,2);
  });
  await check('concurrent completions serialize, do not duplicate, and preserve earlier timestamps',async()=>{
    const clients=[new pg.Client(config),new pg.Client(config)];await Promise.all(clients.map(c=>c.connect()));
    try{await Promise.all(clients.map((c,i)=>as(users.racer,x=>x.query('select rpc_course_lesson_complete($1,$2)',i?[l2,r2]:[l1,r1]),c)));}
    finally{await Promise.all(clients.map(c=>c.end()));}
    assert.equal((await q(users.racer,'select * from course_lesson_progress')).rowCount,2);
    assert.equal((await q(users.racer,'select * from course_module_progress where module_id=$1 and completed_at is not null',[module])).rowCount,1);
  });
  await check('stale revisions are rejected; old completion evidence survives replacement',async()=>{
    staged=await revision(l1,'r2','New wording');
    assert.equal((await q(users.new,'select * from course_lesson_revisions where id=$1',[staged])).rowCount,0);
    await q(users.admin,'select rpc_course_lessons_publish($1,$2)',[module,[staged,r2,ro]]);
    await reject(users.partial,'select rpc_course_lesson_complete($1,$2)',[l1,r1],/revision changed/);
    await reject(users.admin,'select * from rpc_course_lesson_backfill($1,$2,false)',[module,'another-batch'],/equivalence does not match/);
    assert.equal((await q(users.certified,'select * from course_lesson_progress where lesson_id=$1',[l1])).rows[0].revision_id,r1);
    assert.equal((await q(users.new,'select * from course_lesson_revisions where id=$1',[r1])).rowCount,0);
  });
  await check('archiving program hides content and blocks lesson writes without revoking historical achievements',async()=>{
    await q(users.admin,"update training_programs set status='archived' where id=$1",[program]);
    assert.equal((await q(users.new,'select * from course_lesson_revisions')).rowCount,0);
    await reject(users.partial,'select rpc_course_lesson_complete($1,$2)',[l1,staged]);
    assert.equal((await q(users.certified,'select * from certificates')).rowCount,1);
    assert.equal((await q(users.certified,'select * from course_lesson_progress')).rowCount,2);
  });
  return {scenarios:checks.length,passed:checks,failures:0,historicalRows:Object.fromEntries(Object.entries(before).map(([k,v])=>[k,v.length]))};
}
