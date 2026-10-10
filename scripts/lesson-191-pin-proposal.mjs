import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const base='a1a54d755cda8c609c3006843acc11abfba3437e',sha=b=>createHash('sha256').update(b).digest('hex');
const names=execFileSync('git',['diff',base,'--name-only','--diff-filter=M'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const receipt={status:'draft',target:'resources-audit',owner_release_approval:false,predecessor_commit:base,changed_existing_files:{}};
for(const p of names){const b=execFileSync('git',['show',base+':'+p],{maxBuffer:32*1024*1024});receipt.changed_existing_files[p]={predecessor_sha256:sha(b),proposed_sha256:sha(fs.readFileSync(p)),predecessor_utf8:b.toString('utf8')};}
fs.writeFileSync('docs/lesson-191-proposal-receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log('Pinned '+names.length+' exact successors.');
