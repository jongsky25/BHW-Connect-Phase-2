// Wait for the complete normal CI and Remotion regressions at this exact draft SHA.
import {inheritedNarrationFailure} from './lesson-181-inherited-ci.mjs';
import fs from 'node:fs';import {execFileSync} from 'node:child_process';
// Count the actual complete current registry; never copy an earlier lesson count.
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),deadline=Date.now()+30*60*1000;
if(!process.env.GH_TOKEN)throw Error('Read-only Actions token required');
while(Date.now()<deadline){
 const response=await fetch('https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/runs?head_sha='+sha,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'}});
 if(!response.ok)throw Error('Exact-head CI status unavailable: '+response.status);
 const {workflow_runs:runs}=await response.json();const checks=['CI','Remotion clips'].map(name=>runs.filter(r=>r.name===name&&r.head_sha===sha&&['pull_request','workflow_dispatch'].includes(r.event)).sort((a,b)=>b.id-a.id)[0]);
 if(checks[1]?.status==='completed'&&checks[1].conclusion!=='success')throw Error('Complete Remotion regression failed');
 if(checks.every(r=>r?.status==='completed')&&['success','failure'].includes(checks[0].conclusion)&&checks[1].conclusion==='success'){
  let inherited=null;
  const auth={Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'};
  async function jobLog(job){const redirect=await fetch(`https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/jobs/${job.id}/logs`,{headers:auth,redirect:'manual'});const location=redirect.headers.get('location');if(redirect.status!==302||!location||new URL(location).protocol!=='https:')throw Error('Completed CI log unavailable');const response=await fetch(location);if(!response.ok)throw Error('Completed CI log unavailable');return response.text();}
  if(checks[0].conclusion==='failure'){
   inherited=inheritedNarrationFailure();
   const response=await fetch(`https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/runs/${checks[0].id}/jobs?per_page=100`,{headers:auth});if(!response.ok)throw Error('CI jobs unavailable');const {jobs}=await response.json();const failed=jobs.filter(j=>j.conclusion==='failure');if(failed.length!==1||failed[0].name!=='checks'||jobs.find(j=>j.name==='e2e')?.conclusion!=='success'||jobs.find(j=>j.name==='changes')?.conclusion!=='success')throw Error('Failure exceeds the inherited narration guard');
   const steps=failed[0].steps.filter(s=>s.conclusion==='failure');if(steps.length!==1||steps[0].name!=='Unit tests')throw Error('Unexpected CI step failure');
   const logs=(await jobLog(failed[0])).replace(/\x1b\[[0-9;]*m/g,'');const counts=logs.match(/Tests\s+1 failed\s+\|\s+(\d+) passed\s+\((\d+)\)/);if(!counts||!logs.includes('committed narration is current for every converted subchapter'))throw Error('Exact single inherited failure not established');inherited.unit_tests={failed:1,passed:Number(counts[1]),total:Number(counts[2])};fs.mkdirSync('.preview/lesson181-render-logs',{recursive:true});fs.writeFileSync('.preview/lesson181-render-logs/CI-checks-'+failed[0].id+'.txt',logs);
  }
  const listing=execFileSync('npx',['remotion','compositions','--quiet',...(fs.existsSync('/usr/bin/chromium')?['--browser-executable=/usr/bin/chromium']:[])],{cwd:'remotion',encoding:'utf8',maxBuffer:4*1024*1024});
  const registry=listing.trim().split('\n').at(-1).split(/\s+/).filter(id=>/^[A-Za-z0-9-]+$/.test(id));
  const registryCount=registry.length;if(!registryCount||new Set(registry).size!==registryCount||!registry.includes('SafetyIdentifyStoryFil')||!registry.includes('SafetyIdentifyStoryEn'))throw Error('Complete unique current registry required');
  const rendered=[];
  const jobsResponse=await fetch(`https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/runs/${checks[1].id}/jobs?per_page=100`,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'}});
  if(!jobsResponse.ok)throw Error('Complete render jobs unavailable');
  const {jobs}=await jobsResponse.json();if(jobs.length!==8||jobs.some(j=>j.conclusion!=='success'))throw Error('All eight render shards must pass');
  for(const job of jobs){
   const redirect=await fetch(`https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/jobs/${job.id}/logs`,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN},redirect:'manual'});
   const location=redirect.headers.get('location');if(redirect.status!==302||!location||new URL(location).protocol!=='https:')throw Error('Completed render log redirect unavailable');
   const logs=await fetch(location);if(!logs.ok)throw Error('Completed render log unavailable');
   const text=await logs.text();fs.mkdirSync('.preview/lesson181-render-logs',{recursive:true});fs.writeFileSync('.preview/lesson181-render-logs/'+job.id+'.txt',text);rendered.push(...Array.from(text.matchAll(/\$ remotion render ([A-Za-z0-9-]+) \S+ /g),m=>m[1]));
  }
  if(rendered.length!==registryCount||JSON.stringify([...rendered].sort())!==JSON.stringify([...registry].sort()))throw Error('Every frozen registry composition must have an actual successful render');
  const report={status:inherited?'completed_with_inherited_failure':'passed',full_CI_passed:!inherited,inherited_failure:inherited,registry,rendered_compositions:rendered,head_sha:sha,verified_at:new Date().toISOString(),runs:checks.map(r=>({name:r.name,id:r.id,url:r.html_url,conclusion:r.conclusion,run_attempt:r.run_attempt})),complete_Remotion_registry:registryCount};
  fs.mkdirSync('.preview/lesson181-deliverables',{recursive:true});fs.writeFileSync('.preview/lesson181-deliverables/lesson-181-final-ci.json',JSON.stringify(report,null,2)+'\n');console.log((inherited?'Normal CI retains its recorded inherited failure; complete ':'Normal CI and complete ')+registryCount+'-composition Remotion regression passed at '+sha);process.exit(0);
 }
 console.log('Waiting for normal CI and the complete registry at '+sha);await new Promise(r=>setTimeout(r,30000));
}
throw Error('Complete exact-head CI did not finish within 30 minutes');
