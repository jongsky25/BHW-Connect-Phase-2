// One deliberate post-deploy smoke check with stable fixtures; no E2E suite or test data.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const report={checked_at:new Date().toISOString(),source_commit:process.env.GITHUB_SHA,status:'pending',checks:[]};
const file='lesson-155-live-smoke.json';
if(!process.env.E2E_STABLE_BHW_PASSWORD||!process.env.E2E_STABLE_ADMIN_PASSWORD){
 report.status='not-run';report.reason='Stable BHW/admin fixture credentials are unavailable in Actions; target publication and media checks remain independently verified.';
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(report.reason);process.exit(0);
}
const {chromium}=await import('playwright');
const browser=await chromium.launch({headless:true});
const base='https://bhw-connect-phase-2.vercel.app';
try{
 for(const [role,username,password]of [['bhw','bhw.stable',process.env.E2E_STABLE_BHW_PASSWORD],['admin','admin.stable',process.env.E2E_STABLE_ADMIN_PASSWORD]]){
  const context=await browser.newContext();const page=await context.newPage();
  await page.goto(base+'/login');await page.getByLabel('Username',{exact:true}).fill(username);await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Mag-login',exact:true}).click();await page.waitForURL(base+'/home',{timeout:30000});
  report.checks.push({role,login:true});
  if(role==='bhw'){
   const response=await page.request.post(base+'/api/chat',{data:{question:'What self-management skills should a BHW have?'}});
   assert.ok(response.ok(),'Chat Guide HTTP success');const body=await response.json();assert.equal(body.type,'answer');
   const kb=JSON.parse(fs.readFileSync('lesson-155-kb-after.json','utf8'));assert.equal(body.answer.id,kb.rows[0].id,'Chat Guide selects the approved self-management answer');
   report.checks.push({role,chat_guide:true,approved_answer_id:body.answer.id});
  }else{
   const response=await page.goto(base+'/admin/dashboard');assert.equal(response.status(),200);assert.ok(page.url().includes('/admin/dashboard'));
   assert.ok(!(await page.locator('body').innerText()).includes('Application error'));report.checks.push({role,admin_dashboard:true});
  }
  await context.close();
 }
 report.status='passed';
}catch(error){report.status='failed';report.error=error.message;process.exitCode=1;}
finally{await browser.close();fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
