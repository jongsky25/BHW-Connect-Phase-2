// Wait for the complete normal CI and Remotion regressions at this exact draft SHA.
import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
// Reconciled approved main has 86 compositions; append this target pair.
const registryCount=88;
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),deadline=Date.now()+45*60*1000;
if(!process.env.GH_TOKEN)throw Error('Read-only Actions token required');
while(Date.now()<deadline){
 const response=await fetch('https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/runs?head_sha='+sha,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'}});
 if(!response.ok)throw Error('Exact-head CI status unavailable: '+response.status);
 const {workflow_runs:runs}=await response.json();const checks=['CI','Remotion clips'].map(name=>runs.filter(r=>r.name===name&&r.head_sha===sha&&['pull_request','workflow_dispatch'].includes(r.event)).sort((a,b)=>b.id-a.id)[0]);
 if(checks.every(r=>r?.status==='completed')){
  if(checks[1].conclusion!=='success')throw Error('Required exact-head Remotion regression failed');
  const listing=execFileSync('npx',['remotion','compositions','--quiet'],{cwd:'remotion',encoding:'utf8',maxBuffer:4*1024*1024});
  const registry=listing.trim().split('\n').at(-1).split(/\s+/).filter(id=>/^[A-Za-z0-9-]+$/.test(id));
  if(registry.length!==registryCount||new Set(registry).size!==registryCount)throw Error('Frozen registry must contain 88 unique compositions');
  const rendered=[],renderLogs=[];
  fs.mkdirSync('.preview/lesson174-deliverables',{recursive:true});
  const jobsResponse=await fetch(`https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/runs/${checks[1].id}/jobs?per_page=100`,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'}});
  if(!jobsResponse.ok)throw Error('Complete render jobs unavailable');
  const {jobs}=await jobsResponse.json();if(jobs.length!==4||jobs.some(j=>j.conclusion!=='success'))throw Error('All four render shards must pass');
  for(const job of jobs){
   const redirect=await fetch(`https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/jobs/${job.id}/logs`,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN},redirect:'manual'});
   const location=redirect.headers.get('location');if(redirect.status!==302||!location||new URL(location).protocol!=='https:')throw Error('Completed render log redirect unavailable');
   const logs=await fetch(location);if(!logs.ok)throw Error('Completed render log unavailable');
   const text=await logs.text(),file='.preview/lesson174-deliverables/remotion-job-'+job.id+'.log';fs.writeFileSync(file,text);renderLogs.push({job_id:job.id,name:job.name,file,sha256:createHash('sha256').update(text).digest('hex')});rendered.push(...Array.from(text.matchAll(/\$ remotion render ([A-Za-z0-9-]+) \S+ /g),m=>m[1]));
  }
  if(rendered.length!==registryCount||JSON.stringify([...rendered].sort())!==JSON.stringify([...registry].sort()))throw Error('Every frozen registry composition must have an actual successful render');
  const report={status:checks[0].conclusion==='success'?'passed':'failed',registry,registry_source_sha256:createHash('sha256').update(fs.readFileSync('remotion/src/Root.tsx')).digest('hex'),render_logs:renderLogs,rendered_compositions:rendered,head_sha:sha,verified_at:new Date().toISOString(),runs:checks.map(r=>({name:r.name,id:r.id,url:r.html_url,conclusion:r.conclusion,run_attempt:r.run_attempt})),complete_Remotion_registry:registryCount};
  fs.mkdirSync('.preview/lesson174-deliverables',{recursive:true});fs.writeFileSync('.preview/lesson174-deliverables/lesson-174-final-ci.json',JSON.stringify(report,null,2)+'\n');if(report.status!=='passed')throw Error('Normal CI failed at exact head; complete 88 render evidence retained, final acceptance package blocked');console.log('Normal CI and complete 88-composition Remotion regression passed at '+sha);process.exit(0);
 }
 console.log('Waiting for normal CI and all 88 compositions at '+sha);await new Promise(r=>setTimeout(r,30000));
}
throw Error('Complete exact-head CI did not finish within 45 minutes');
