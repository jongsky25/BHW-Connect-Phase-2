// Pin exact reconciliation of the owner-reviewed Apple draft with released main.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const approval=JSON.parse(fs.readFileSync('docs/lesson-182-owner-approval.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const r={reviewed182:approval.reviewed_head,approvedMain:approval.integrated_main,files:{}};
const paths=[...new Set([
 ...execFileSync('git',['diff','--name-only',approval.integrated_main,approval.reviewed_head],{encoding:'utf8'}).trim().split('\n'),
 ...execFileSync('git',['diff','--name-only','HEAD'],{encoding:'utf8'}).trim().split('\n'),
])].filter(Boolean);
for(const p of paths){
 if(!fs.existsSync(p)||!fs.statSync(p).isFile()||p.startsWith('public/')||p.startsWith('remotion/public/'))continue;
 let reviewed,main;try{reviewed=execFileSync('git',['show',approval.reviewed_head+':'+p],{maxBuffer:32*1024*1024,stdio:['ignore','pipe','ignore']});main=execFileSync('git',['show',approval.integrated_main+':'+p],{maxBuffer:32*1024*1024,stdio:['ignore','pipe','ignore']});}catch{continue;}
 const actual=fs.readFileSync(p);
 if(sha(actual)===sha(reviewed)&&sha(actual)===sha(main))continue;
 // Integration source is UTF-8; binary media never use a historical view.
 if(!Buffer.from(reviewed.toString()).equals(reviewed)||!Buffer.from(main.toString()).equals(main))continue;
 r.files[p]={integrated_sha256:sha(actual),reviewed182_sha256:sha(reviewed),reviewed182_utf8:reviewed.toString(),approvedMain_sha256:sha(main),approvedMain_utf8:main.toString()};
}
fs.writeFileSync('docs/lesson-182-release-integration.json',JSON.stringify(r,null,2)+'\n');console.log('Pinned '+Object.keys(r.files).length+' exact reconciled sources.');
