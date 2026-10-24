// @vitest-environment node
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {loadLessonMap,validateRelease} from '../lib/chapter1-assessment-content.mjs';
import {buildGiftsLactationProposal,renderGiftsLactationReview} from '../lib/feedback-gifts-lactation-proposal.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),dir=join(root,'content/training/day1-basic-competencies/learner-assessment-v2');
const read=p=>JSON.parse(readFileSync(join(dir,p),'utf8'));
const base=read('releases/chapter1-feedback-accreditation-csc-v3/release.json'),proposal=read('proposals/fb-2.4-gifts-lactation/proposal.json');
const context={...loadLessonMap(root),orientation:read('orientation.json')};
it('changes only paired T08/T09 and preserves the approved UHC/CSC content, checkpoints and pins',()=>{
  const before=JSON.stringify(base),candidate=buildGiftsLactationProposal(base,proposal,context);
  for(const phase of ['pretest','posttest'])expect(candidate.forms[phase].items.filter(q=>!['T08','T09'].includes(q.slot)))
    .toEqual(base.forms[phase].items.filter(q=>!['T08','T09'].includes(q.slot)));
  expect(candidate.checkpoints).toEqual(base.checkpoints);expect(candidate.curriculum_revisions).toEqual(base.curriculum_revisions);
  expect(candidate.publication_status).toBe('draft');expect(validateRelease(candidate,context)).toHaveLength(9);
  expect(JSON.stringify(base)).toBe(before);
});
it('keeps the exact bilingual review packet in sync with the candidate copy',()=>{
  expect(readFileSync(join(dir,'proposals/fb-2.4-gifts-lactation/REVIEW.md'),'utf8')).toBe(renderGiftsLactationReview(base,proposal));
});
it.each([
  p=>{p.base_release_sha256='0'.repeat(64);},
  p=>{p.replacements[0].item.item_id=base.forms.pretest.items[0].item_id;},
  p=>{p.replacements[0].item.options[0].label.fil='';},
  p=>{p.approval_status='approved';},
  p=>{p.continuity.existing_drafts='replace';},
])('rejects drift, reused identities, missing translation, false approval or broken continuity (%#)',mutate=>{
  const p=structuredClone(proposal);mutate(p);expect(()=>buildGiftsLactationProposal(base,p,context)).toThrow();
});
it('exports only a draft and refuses overwrite/import/source destinations',()=>{
  const temp=mkdtempSync(join(tmpdir(),'fb24-')),cli=join(root,'scripts/feedback-gifts-lactation-proposal.mjs');
  try{
    const out=join(temp,'draft.json');
    const summary=JSON.parse(execFileSync(process.execPath,[cli,'--output',out],{encoding:'utf8'}));
    expect(summary.activated).toBe(false);expect(summary.imported).toBe(false);
    expect(JSON.parse(readFileSync(out,'utf8')).publication_status).toBe('draft');
    for(const args of [['--import'],['--output',out],['--output',join(dir,'release.json')]])expect(()=>execFileSync(process.execPath,[cli,...args],{stdio:'pipe'})).toThrow();
  }finally{rmSync(temp,{recursive:true,force:true});}
});
