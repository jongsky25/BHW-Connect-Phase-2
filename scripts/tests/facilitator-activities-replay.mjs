// Disposable loopback-only rehearsal; never uses application credentials.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const {default:pg}=await import(pathToFileURL(createRequire(import.meta.url).resolve(process.env.PG_TEST_MODULE || 'pg')));
const source=fileURLToPath(new URL('../..',import.meta.url)),database='bhw_activity_check_'+Date.now();
const config={host:'127.0.0.1',port:Number(process.env.PG_TEST_PORT || 55432),user:'postgres'};
const admin=new pg.Client({...config,database:'postgres'});await admin.connect();await admin.query('create database '+database);await admin.end();
const db=new pg.Client({...config,database});await db.connect();
try {
  let platform=fs.readFileSync(path.join(source,'scripts/tests/training-foundation-platform.sql'),'utf8');
  for(const role of ['anon','authenticated','service_role'])if((await db.query('select 1 from pg_roles where rolname=$1',[role])).rowCount)platform=platform.replace(new RegExp('create role '+role+'[^;]*;'),'');
  await db.query(platform);
  const files=fs.readdirSync(path.join(source,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort();
  for(const f of files){try{await db.query(fs.readFileSync(path.join(source,'supabase/migrations',f),'utf8'));}catch(e){throw new Error(f+': '+e.message);}}
  console.log('Replayed '+files.length+' migrations');
  const {seedLegacy}=await import(pathToFileURL(path.join(source,'scripts/tests/training-foundation-scenarios.mjs')));
  const fixture=await seedLegacy(db);
  const {runActivityScenarios}=await import(pathToFileURL(path.join(source,'scripts/tests/facilitator-activities-scenarios.mjs')));
  const checks=await runActivityScenarios(db,fixture);
  if(process.env.PG_TEST_REPORT)fs.writeFileSync(process.env.PG_TEST_REPORT,JSON.stringify({database,migrations:files.length,checks},null,2));
} finally {await db.end();}
