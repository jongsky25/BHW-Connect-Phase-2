// One deliberate authenticated admin preview; no learner saves or E2E data.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createClient,signIn,requireEnv} from './lib/supabase-rest.mjs';
const base='https://bhw-connect-phase-2.vercel.app';
const key=requireEnv('KB_LOADER_ANON_KEY'),username=requireEnv('KB_LOADER_USERNAME'),password=requireEnv('KB_LOADER_PASSWORD');
const url='https://ltzicxyefizxoqhfuuzc.supabase.co';
const token=await signIn(url,key,username,password),client=createClient(url,key,token);
const programs=await client.get('training_programs?select=id&content_key=eq.bhw-reference-manual&status=eq.published&limit=1');assert.equal(programs.length,1);
const lock=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/locks/ltzicxyefizxoqhfuuzc.json'));
const report={status:'pending',source_commit:process.env.GITHUB_SHA,checked_at:new Date().toISOString(),method:'Authenticated loader-admin production preview; no learner interactions or completion writes',checks:[],errors:[]};
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(base+'/login');await page.getByLabel('Username',{exact:true}).fill(username);await page.getByLabel('Password',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Mag-login',exact:true}).click();await page.waitForURL(u=>u.pathname==='/home'||u.pathname==='/change-password',{timeout:30000});
 if(new URL(page.url()).pathname==='/change-password'){
  report.status='blocked';report.reason='Existing loader-admin required password change; no bypass, account mutation or learner interaction attempted';
  console.log(report.reason);
 }else{
 for(const [lesson_key,id]of Object.entries(lock.lessons['06-komunikasyon']).filter(([key])=>key==='communication-clarify')){
  const path=`/training/${programs[0].id}/chapter-1/${lock.modules['06-komunikasyon']}/${id}?view=lesson`;
  const response=await page.goto(base+path);assert.equal(response.status(),200);
  await page.getByText(/Gibs/).first().waitFor({state:'visible',timeout:30000});
  const text=await page.locator('body').innerText();assert.ok(!text.includes('Mila'));assert.ok(!text.includes('Application error'));
  const image=page.locator('img[src*="gibs-"]').first();await image.waitFor({state:'visible'});
  assert.ok(await image.evaluate(async img=>{await img.decode();return img.complete&&img.naturalWidth>0;}),'Gibs picture loaded');
  report.checks.push({lesson_key,path,HTTP:200,Gibs_visible:true,portrait_or_scene_loaded:true});
 }
 const dashboard=await page.goto(base+'/admin/dashboard');assert.equal(dashboard.status(),200);assert.ok(page.url().endsWith('/admin/dashboard'));
 assert.equal(report.errors.length,0);report.admin_dashboard=true;report.status='passed';
 }
}catch(error){report.status='failed';report.error=error.message;process.exitCode=1;}
finally{await browser.close();fs.writeFileSync('lesson-162-live-smoke.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
