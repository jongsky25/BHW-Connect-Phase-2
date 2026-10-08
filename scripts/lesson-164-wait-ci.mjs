// Wait for the complete normal CI and Remotion regressions at this exact draft SHA.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),deadline=Date.now()+30*60*1000;
if(!process.env.GH_TOKEN)throw Error('Read-only Actions token required');
while(Date.now()<deadline){
 const response=await fetch('https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/runs?head_sha='+sha,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'}});
 if(!response.ok)throw Error('Exact-head CI status unavailable: '+response.status);
 const {workflow_runs:runs}=await response.json();const checks=['CI','Remotion clips'].map(name=>runs.filter(r=>r.name===name&&r.head_sha===sha&&r.event==='pull_request').sort((a,b)=>b.id-a.id)[0]);
 if(checks.some(r=>r?.status==='completed'&&r.conclusion!=='success'))throw Error('Required exact-head regression failed; inspect current PR checks');
 if(checks.every(r=>r?.status==='completed'&&r.conclusion==='success')){
  const report={status:'passed',head_sha:sha,verified_at:new Date().toISOString(),runs:checks.map(r=>({name:r.name,id:r.id,url:r.html_url,conclusion:r.conclusion,run_attempt:r.run_attempt})),complete_Remotion_registry:78};
  fs.mkdirSync('.preview/lesson164-deliverables',{recursive:true});fs.writeFileSync('.preview/lesson164-deliverables/lesson-164-final-ci.json',JSON.stringify(report,null,2)+'\n');console.log('Normal CI and complete 78-composition Remotion regression passed at '+sha);process.exit(0);
 }
 console.log('Waiting for normal CI and all 78 compositions at '+sha);await new Promise(r=>setTimeout(r,30000));
}
throw Error('Complete exact-head CI did not finish within 30 minutes');
