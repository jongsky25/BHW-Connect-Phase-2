// Wait for the complete normal CI and Remotion regressions at this exact draft SHA.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),deadline=Date.now()+30*60*1000;
if(!process.env.GH_TOKEN)throw Error('Read-only Actions token required');
const registry=execFileSync('npx',['remotion','compositions','--quiet',...(process.env.REVIEW_BROWSER_EXECUTABLE?['--browser-executable='+process.env.REVIEW_BROWSER_EXECUTABLE]:[])],{cwd:'remotion',encoding:'utf8'}).trim().split('\n').at(-1).trim().split(/\s+/);
if(registry.length!==78||new Set(registry).size!==78||registry.slice(-2).join(',')!=='CommunicationClarifyStoryFil,CommunicationClarifyStoryEn')throw Error('Actual complete 78-composition registry required');
while(Date.now()<deadline){
 const response=await fetch('https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/runs?head_sha='+sha,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'}});
 if(!response.ok)throw Error('Exact-head CI status unavailable: '+response.status);
 const {workflow_runs:runs}=await response.json();const checks=['CI','Remotion clips'].map(name=>runs.filter(r=>r.name===name&&r.head_sha===sha&&r.event==='pull_request').sort((a,b)=>b.id-a.id)[0]);
 if(checks.some(r=>r?.status==='completed'&&r.conclusion!=='success'))throw Error('Required exact-head regression failed; inspect current PR checks');
 if(checks.every(r=>r?.status==='completed'&&r.conclusion==='success')){
  const jobChecks=await Promise.all(checks.map(async run=>{
   const response=await fetch('https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/runs/'+run.id+'/jobs?filter=latest&per_page=100',{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'}});
   if(!response.ok)throw Error('Exact-head job results unavailable');
   const {jobs}=await response.json();const required=run.name==='CI'?['checks','e2e']:['render (0)','render (1)','render (2)','render (3)'];
   if(required.some(name=>!jobs.some(j=>j.name===name&&j.status==='completed'&&j.conclusion==='success')))throw Error('All checks, disposable-Supabase E2E and four complete render shards must pass');
   return {run_id:run.id,jobs:jobs.map(j=>({id:j.id,name:j.name,conclusion:j.conclusion}))};
  }));
  const report={status:'passed',head_sha:sha,verified_at:new Date().toISOString(),runs:checks.map(r=>({name:r.name,id:r.id,url:r.html_url,conclusion:r.conclusion,run_attempt:r.run_attempt})),complete_Remotion_registry:registry.length,composition_ids:registry,registry_ids_sha256:createHash('sha256').update(JSON.stringify(registry)).digest('hex'),job_checks:jobChecks};
  fs.mkdirSync('.preview/lesson162-deliverables',{recursive:true});fs.writeFileSync('.preview/lesson162-deliverables/lesson-162-final-ci.json',JSON.stringify(report,null,2)+'\n');console.log('Normal CI and complete 78-composition Remotion regression passed at '+sha);process.exit(0);
 }
 console.log('Waiting for normal CI and all 78 compositions at '+sha);await new Promise(r=>setTimeout(r,30000));
}
throw Error('Complete exact-head CI did not finish within 30 minutes');
