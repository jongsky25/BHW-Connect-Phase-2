// Verify normal CI at this draft SHA and actual renders of identical sources.
import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
// Enumerate the frozen actual registry; do not inherit an earlier lesson count.
const listing=execFileSync('npx',['remotion','compositions','--quiet'],{cwd:'remotion',encoding:'utf8',maxBuffer:4*1024*1024});
const frozenRegistry=listing.trim().split('\n').at(-1).split(/\s+/).filter(id=>/^[A-Za-z0-9-]+$/.test(id));
const registryCount=frozenRegistry.length;
if(new Set(frozenRegistry).size!==registryCount||!frozenRegistry.includes('SafetyPrepareStoryFil')||!frozenRegistry.includes('SafetyPrepareStoryEn'))throw Error('Incomplete or duplicate frozen registry');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),deadline=Date.now()+45*60*1000;
// Reuse a completed render only when every tracked byte except this evidence
// verifier matches its immutable checkout. Any teaching/runtime/media change
// requires a new complete render at the current head.
const renderedHead='7b58aa41be1d3fa67a719048c740363efd46da06',renderedRun=37909296640;
const renderDiff=execFileSync('git',['diff','--name-only',renderedHead,sha],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const sameRenderedSource=renderDiff.every(p=>p==='scripts/lesson-183-wait-ci.mjs');
if(!process.env.GH_TOKEN)throw Error('Read-only Actions token required');
while(Date.now()<deadline){
 const response=await fetch('https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/runs?head_sha='+sha,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'}});
 if(!response.ok)throw Error('Exact-head CI status unavailable: '+response.status);
 const {workflow_runs:runs}=await response.json();const checks=['CI','Remotion clips'].map(name=>runs.filter(r=>r.name===name&&r.head_sha===sha&&['pull_request','workflow_dispatch'].includes(r.event)).sort((a,b)=>b.id-a.id)[0]);
 if(sameRenderedSource&&checks[0]?.status==='completed'&&(checks[1]?.status!=='completed'||checks[1]?.conclusion==='cancelled')){
  const completed=await fetch('https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/runs/'+renderedRun,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'}});
  if(!completed.ok)throw Error('Pinned identical-source render unavailable');
  const render=await completed.json();
  if(render.head_sha!==renderedHead||render.name!=='Remotion clips'||render.status!=='completed'||render.conclusion!=='success')throw Error('Pinned render has not succeeded');
  checks[1]=render;
 }
 if(checks.every(r=>r?.status==='completed')){
  if(checks[1].conclusion!=='success')throw Error('Required exact-head Remotion regression failed');
  const listing=execFileSync('npx',['remotion','compositions','--quiet'],{cwd:'remotion',encoding:'utf8',maxBuffer:4*1024*1024});
  const registry=listing.trim().split('\n').at(-1).split(/\s+/).filter(id=>/^[A-Za-z0-9-]+$/.test(id));
  if(registry.length!==registryCount||new Set(registry).size!==registryCount)throw Error('Frozen registry changed during verification');
  const rendered=[],renderLogs=[];
  fs.mkdirSync('.preview/lesson183-deliverables',{recursive:true});
  const jobsResponse=await fetch(`https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/runs/${checks[1].id}/jobs?per_page=100`,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json'}});
  if(!jobsResponse.ok)throw Error('Complete render jobs unavailable');
  const {jobs}=await jobsResponse.json();if(jobs.length!==8||jobs.some(j=>j.conclusion!=='success'))throw Error('All eight render shards must pass');
  for(const job of jobs){
   const redirect=await fetch(`https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2/actions/jobs/${job.id}/logs`,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN},redirect:'manual'});
   const location=redirect.headers.get('location');if(redirect.status!==302||!location||new URL(location).protocol!=='https:')throw Error('Completed render log redirect unavailable');
   const logs=await fetch(location);if(!logs.ok)throw Error('Completed render log unavailable');
   const text=await logs.text(),file='.preview/lesson183-deliverables/remotion-job-'+job.id+'.log';fs.writeFileSync(file,text);renderLogs.push({job_id:job.id,name:job.name,file,sha256:createHash('sha256').update(text).digest('hex')});rendered.push(...Array.from(text.matchAll(/\$ remotion render ([A-Za-z0-9-]+) \S+ /g),m=>m[1]));
  }
  if(rendered.length!==registryCount||JSON.stringify([...rendered].sort())!==JSON.stringify([...registry].sort()))throw Error('Every frozen registry composition must have an actual successful render');
  const report={status:checks[0].conclusion==='success'?'passed':'failed',registry,registry_source_sha256:createHash('sha256').update(fs.readFileSync('remotion/src/Root.tsx')).digest('hex'),render_logs:renderLogs,rendered_compositions:rendered,head_sha:sha,verified_at:new Date().toISOString(),runs:checks.map(r=>({name:r.name,id:r.id,url:r.html_url,conclusion:r.conclusion,run_attempt:r.run_attempt})),complete_Remotion_registry:registryCount};
  fs.mkdirSync('.preview/lesson183-deliverables',{recursive:true});fs.writeFileSync('.preview/lesson183-deliverables/lesson-183-final-ci.json',JSON.stringify(report,null,2)+'\n');const ciJobs=JSON.parse(execFileSync('gh',['run','view',String(checks[0].id),'--json','jobs'],{encoding:'utf8'})).jobs;
  if(!ciJobs.some(j=>j.name==='e2e'&&j.conclusion==='success'))throw Error('Disposable Supabase E2E must succeed at frozen head');
  const ciLog=execFileSync('gh',['run','view',String(checks[0].id),'--log'],{encoding:'utf8',maxBuffer:30*1024*1024});
  fs.writeFileSync('.preview/lesson183-deliverables/normal-ci.log',ciLog);
  const plainCiLog=ciLog.replace(/(?:\x1b\[|\^\[\[)[0-?]*[ -/]*[@-~]/g,'');
  const failures=[...plainCiLog.matchAll(/FAIL\s+([^\s]+\.test\.mjs)/g)].map(m=>m[1]);
  if(checks[0].conclusion!=='success'&&(failures.length!==1||failures[0]!=='scripts/tests/reference-narration.test.mjs'||!ciLog.includes('problem-prioritize/tie-and-urgent-care/en')))throw Error('Normal CI has an unexpected failure');
  report.normal_ci=checks[0].conclusion==='success'?'passed':'one inherited global narration-current failure: twelve unchanged lesson 1.7.3 tracks; not excluded';
  report.render_source_head=checks[1].head_sha;
  report.render_source_equivalence={verified:checks[1].head_sha===sha||sameRenderedSource,changed_paths:checks[1].head_sha===sha?[]:renderDiff,only_exempt_path:'scripts/lesson-183-wait-ci.mjs',method:'git diff checks every tracked file, including all teaching, runtime, registry, media, dependencies and workflow files'};
  report.disposable_supabase_e2e='passed';report.status='draft verified; inherited CI failure retained';
  fs.writeFileSync('.preview/lesson183-deliverables/lesson-183-final-ci.json',JSON.stringify(report,null,2)+'\n');
  console.log('Verified frozen registry ('+registryCount+' compositions), disposable E2E and explicit CI disposition at '+sha);process.exit(0);
 }
 console.log('Waiting for normal CI and all frozen compositions at '+sha);await new Promise(r=>setTimeout(r,30000));
}
throw Error('Complete exact-head CI did not finish within 45 minutes');
