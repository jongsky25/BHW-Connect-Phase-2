// Download only hash-pinned earlier draft artifacts; retain raw attempts separately.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';
if(fs.existsSync('docs/lesson-162-evidence-origins.json')){
 const origins=JSON.parse(fs.readFileSync('docs/lesson-162-evidence-origins.json'));
 for(const origin of origins.runs){
  const dir='.preview/lesson162-retained/'+origin.run_id;fs.mkdirSync(dir,{recursive:true});
  execFileSync('gh',['run','download',String(origin.run_id),'--repo','jongsky25/BHW-Connect-Phase-2','--name','lesson162-raw-audio-evidence','--dir',dir],{stdio:'inherit'});
 }
}
