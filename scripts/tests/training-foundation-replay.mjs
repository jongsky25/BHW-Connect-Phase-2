// Requires pg. Uses only loopback and creates a new uniquely named disposable DB.
// Never accepts a connection URL or uses application environment credentials.
import {createRequire} from 'node:module';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const resolve=createRequire(import.meta.url).resolve;
const {default:pg}=await import(pathToFileURL(resolve(process.env.PG_TEST_MODULE || 'pg')).href);
const database=`bhw_foundation_${Date.now()}`;
const config={host:'127.0.0.1',port:55432,user:'postgres',database:'postgres'};
const root=new URL('../../',import.meta.url);
const master=new pg.Client(config);await master.connect();
await master.query(`create database ${database}`);await master.end();
const db=new pg.Client({...config,database});await db.connect();
try {
  // Roles are cluster-wide, and are created only if absent in a repeat rehearsal.
  let platform=await readFile(new URL('training-foundation-platform.sql',import.meta.url),'utf8');
  for(const role of ['anon','authenticated','service_role']){
    if((await db.query('select 1 from pg_roles where rolname=$1',[role])).rowCount)platform=platform.replace(new RegExp(`create role ${role}[^;]*;`),'');
  }
  await db.query(platform);
  const dir=new URL('supabase/migrations/',root);
  const files=(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort();
  const {seedLegacy,runScenarios}=await import('./training-foundation-scenarios.mjs');
  let fixture;
  for(const file of files){
    if(file==='20260924000000_training_lesson_foundation.sql')fixture=await seedLegacy(db);
    try {await db.query(await readFile(new URL(file,dir),'utf8'));}
    catch(e){throw new Error(`Migration ${file}: ${e.message}`,{cause:e});}
  }
  console.log(`Replayed ${files.length} migrations on ${(await db.query('select version()')).rows[0].version}`);
  const results=await runScenarios(db,pg,{...config,database},fixture);
  const report={database,migrations:files.length,postgres:(await db.query('select version()')).rows[0].version,...results};
  if(process.env.PG_TEST_REPORT)await writeFile(process.env.PG_TEST_REPORT,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));assert.equal(results.failures,0);
} finally {await db.end();}
