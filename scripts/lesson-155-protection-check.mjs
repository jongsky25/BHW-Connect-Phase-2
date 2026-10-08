// Current local protection audit, independent of released predecessor views.
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>fs.readFileSync(p),j=p=>JSON.parse(read(p));
const baseline=j('docs/lesson-155-integration-baseline.json'),base='content/training/day1-basic-competencies/modules/05-bhw-at-barangay/',leaf=base+'lessons/bhw-self-management/';
const allowed=new Set([base+'lesson.en.md',base+'lesson.fil.md',base+'qa-entries.json','content/training/day1-basic-competencies/narration.json']);
const changed=[],unexpected=[],missing=[];
for(const [p,h]of Object.entries(baseline.file_hashes)){
 if(!fs.existsSync(p)){missing.push(p);continue;}if(sha(read(p))!==h){changed.push(p);if(!p.startsWith(leaf)&&!allowed.has(p))unexpected.push(p);}
}
const oldManifest=JSON.parse(execFileSync('git',['show',baseline.commit+':content/training/day1-basic-competencies/narration.json'],{maxBuffer:32*1024*1024}));
const current=j('content/training/day1-basic-competencies/narration.json');
const siblingMappingChanges=Object.keys(oldManifest.lessons).filter(k=>k!=='bhw-self-management'&&JSON.stringify(oldManifest.lessons[k])!==JSON.stringify(current.lessons[k]));
const siblingHistoryChanges=Object.keys(oldManifest.history??{}).filter(k=>k!=='bhw-self-management'&&JSON.stringify(oldManifest.history[k])!==JSON.stringify(current.history[k]));
const approval=j('docs/lesson-155-owner-approval.json');const proposal=j('docs/lesson-155-proposal-receipt.json');const unpinned=Object.entries(proposal.changed_existing_files).filter(([p,v])=>sha(read(p))!==v.proposed_sha256&&sha(read(p))!==approval.approved_source_sha256[p]).map(([p])=>p);
const report={collected_at:new Date().toISOString(),baseline_commit:baseline.commit,reviewed_source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),protected_prior_public_files:Object.keys(baseline.file_hashes).filter(p=>p.startsWith('public/')).length,protected_sibling_sources:Object.keys(baseline.file_hashes).filter(p=>p.startsWith(base+'lessons/')&&!p.startsWith(leaf)).length,changed_existing_files:changed,unexpected_changes:unexpected,missing_files:missing,sibling_mapping_changes:siblingMappingChanges,sibling_history_changes:siblingHistoryChanges,unpinned_proposal_files:unpinned,owner_release_approval:approval.interpreted_authorization==='merge and deploy to live',limitations:['Local source and byte audit; no published database rows or learner progress queried.','Owner approved exact package for live release; human listening is not asserted.']};
report.status=unexpected.length||missing.length||siblingMappingChanges.length||siblingHistoryChanges.length||unpinned.length?'failed':'passed';
fs.writeFileSync('docs/lesson-155-protection.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.status!=='passed')process.exitCode=1;
