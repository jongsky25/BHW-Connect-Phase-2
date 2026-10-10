// Exact-head normal checks, disposable E2E and every registry render. No release operations.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),out='.preview/lesson182-deliverables';fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const token=process.env.GH_TOKEN;if(!token)throw Error('Read-only Actions token required');
const api='https://api.github.com/repos/jongsky25/BHW-Connect-Phase-2';
const request=async(p,redirect='follow')=>{const r=await fetch(api+p,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'},redirect});if(!r.ok&&r.status!==302)throw Error('Actions evidence unavailable: '+r.status);return r;};
const json=async p=>(await request(p)).json();const deadline=Date.now()+45*60*1000;
let checks;
while(Date.now()<deadline){const {workflow_runs:runs}=await json('/actions/runs?head_sha='+head+'&per_page=100');checks=['CI','Remotion clips'].map(name=>runs.filter(r=>r.name===name&&r.head_sha===head&&r.event==='pull_request').sort((a,b)=>b.id-a.id)[0]);if(checks.every(r=>r?.status==='completed'))break;console.log('Waiting for exact-head normal CI and complete registry at '+head);await new Promise(r=>setTimeout(r,30000));}
if(!checks.every(r=>r?.status==='completed'))throw Error('Exact-head regressions still pending');
const ciJobs=(await json(`/actions/runs/${checks[0].id}/jobs?per_page=100`)).jobs;
if(ciJobs.find(j=>j.name==='e2e')?.conclusion!=='success')throw Error('Disposable local Supabase E2E must pass');
async function log(job){const r=await request(`/actions/jobs/${job.id}/logs`,'manual');if(r.status===302){const location=r.headers.get('location');if(new URL(location).protocol!=='https:')throw Error('Unsafe log redirect');const downloaded=await fetch(location);if(!downloaded.ok)throw Error('Job log unavailable');return downloaded.text();}return r.text();}
const normal=[];for(const job of ciJobs){const text=await log(job),file=`lesson-182-ci-${job.name}.log`;fs.writeFileSync(path.join(out,file),text);normal.push({name:job.name,conclusion:job.conclusion,file,sha256:sha(text),steps:job.steps.map(s=>({name:s.name,conclusion:s.conclusion}))});}
let status='passed';
if(checks[0].conclusion!=='success'){
 const text=fs.readFileSync(path.join(out,'lesson-182-ci-checks.log'),'utf8');
 const failures=[...text.matchAll(/FAIL\s+([^\r\n]+)/g)].map(m=>m[1]);
 if(!failures.length||failures.some(line=>!line.includes('scripts/tests/reference-narration.test.mjs'))||!text.includes('problem-prioritize'))throw Error('Normal CI has a new or unclassified failure; inspect exact-head log');
 status='inherited_failure';
}
if(checks[1].conclusion!=='success')throw Error('Entire Remotion registry must pass');
const listing=execFileSync('npx',['remotion','compositions','--quiet',...(process.env.LESSON182_BROWSER_PATH?['--browser-executable',process.env.LESSON182_BROWSER_PATH]:[])],{cwd:'remotion',encoding:'utf8',maxBuffer:4*1024*1024});const registry=listing.trim().split('\n').at(-1).split(/\s+/).filter(id=>/^[A-Za-z0-9-]+$/.test(id));
if(new Set(registry).size!==registry.length||!registry.includes('SafetyControlsStoryFil')||!registry.includes('SafetyControlsStoryEn'))throw Error('Invalid frozen registry');
const jobs=(await json(`/actions/runs/${checks[1].id}/jobs?per_page=100`)).jobs;if(jobs.length!==8||jobs.some(j=>j.conclusion!=='success'))throw Error('All eight render shards must pass');
const rendered=[];for(const job of jobs){const text=await log(job);rendered.push(...Array.from(text.matchAll(/\$ remotion render ([A-Za-z0-9-]+) \S+ /g),m=>m[1]));const name='lesson-182-'+job.name.replace(/[^a-zA-Z0-9-]/g,'-')+'.log';fs.writeFileSync(path.join(out,name),text);}
if(rendered.length!==registry.length||JSON.stringify([...rendered].sort())!==JSON.stringify([...registry].sort()))throw Error('Registry/log render count or IDs differ');
const artifacts=(await json(`/actions/runs/${checks[1].id}/artifacts?per_page=100`)).artifacts.filter(a=>a.name.startsWith('remotion-renders-'));
if(artifacts.length!==8)throw Error('All render artifacts required');const receipts=[];
for(const artifact of artifacts){const response=await request(`/actions/artifacts/${artifact.id}/zip`,'manual');if(response.status!==302)throw Error('Render artifact redirect missing');const location=response.headers.get('location');if(new URL(location).protocol!=='https:')throw Error('Unsafe artifact redirect');const fetched=await fetch(location);if(!fetched.ok)throw Error('Render artifact unavailable');const data=Buffer.from(await fetched.arrayBuffer());const archive=path.join(out,'lesson-182-'+artifact.name+'.zip');fs.writeFileSync(archive,data);const checked=execFileSync('python3',['-c',String.raw`import sys,zipfile,json,hashlib,pathlib
with zipfile.ZipFile(sys.argv[1]) as z:
 n=z.namelist();assert len(n)==len(set(n)) and z.testzip() is None
 for p in n:assert not pathlib.PurePosixPath(p).is_absolute() and '..' not in pathlib.PurePosixPath(p).parts and chr(92) not in p
 print(json.dumps([{'path':p,'bytes':len(z.read(p)),'sha256':hashlib.sha256(z.read(p)).hexdigest()} for p in n if not p.endswith('/')]))`,archive],{encoding:'utf8',maxBuffer:4*1024*1024});receipts.push({id:artifact.id,name:artifact.name,zip_sha256:sha(data),zip_bytes:data.length,members:JSON.parse(checked)});}
const members=receipts.flatMap(r=>r.members.map(m=>m.path));for(const id of registry)for(const suffix of ['.mp4','-poster.jpg'])if(members.filter(p=>p===id+suffix||p.endsWith('/'+id+suffix)).length!==1)throw Error('Missing or duplicate rendered media: '+id+suffix);
const report={status,head_sha:head,verified_at:new Date().toISOString(),complete_Remotion_registry:registry.length,registry,rendered_compositions:rendered,render_artifacts:receipts,normal_jobs:normal,disposable_local_Supabase_E2E:'passed',runs:checks.map(r=>({name:r.name,id:r.id,url:r.html_url,conclusion:r.conclusion})),inherited_failure:status==='inherited_failure'?'Unmodified problem-prioritize selected narration is stale on integrated main; freshness guard retained. Release blocked.':null};fs.writeFileSync(path.join(out,'lesson-182-final-ci.json'),JSON.stringify(report,null,2)+'\n');console.log('Verified exact-head CI, disposable E2E and '+registry.length+' actual registry renders; normal status '+status);
