import assert from 'node:assert/strict';
import { fullFormHash, validateRelease } from './chapter1-assessment-content.mjs';
import { releaseHash } from './feedback-uhc-proposal.mjs';

export function buildGiftsLactationProposal(base, p, context) {
  assert.deepEqual(validateRelease(base, context), []);
  assert.equal(p.schema_version,1); assert.equal(p.editorial_status,'draft');
  assert.equal(p.reviewer,null); assert.equal(p.approval_status,'pending');
  assert.equal(p.base_release_id,base.release_id);
  assert.equal(p.base_release_sha256,releaseHash(base),'Approved baseline drift');
  assert.equal(p.proposed_release_id,'chapter1-feedback-gifts-lactation-v4');
  assert.deepEqual(p.continuity,{
    existing_enrollments:'remain_on_original_release_for_both_phases',existing_drafts:'finish_pinned_form',
    submitted_attempts:'retain_snapshot_answers_and_scores',comparability:'unvalidated_no_automatic_cross_release_gain_comparison',
  });
  assert.deepEqual(p.release_requirements,{approval:'pending_bilingual_policy_assessment_review',activation:'separate_approved_release_only',
    bilingual_reviewer:null,policy_reviewer:null,assessment_reviewer:null});
  const prior=[...Object.values(base.forms).flatMap(f=>f.items),...base.checkpoints.flatMap(c=>[...c.first,...c.alternates])];
  const ids=new Set(prior.map(q=>q.item_id)), keys=new Set(prior.map(q=>q.editorial_key));
  const sources=new Set(p.sources.map(s=>s.id)), seen=new Set(),candidate=structuredClone(base);
  candidate.release_id=p.proposed_release_id;candidate.source_commit='pending-reviewed-commit';candidate.publication_status='draft';
  assert.equal(p.replacements.length,4);
  for(const r of p.replacements){
    assert(['pretest','posttest'].includes(r.phase)&&['T08','T09'].includes(r.slot));
    const key=r.phase+':'+r.slot;assert(!seen.has(key));seen.add(key);
    const old=base.forms[r.phase].items.find(q=>q.slot===r.slot),q=r.item;
    assert.equal(r.replaces_item_id,old.item_id);
    assert(!ids.has(q.item_id)&&!keys.has(q.editorial_key),'New item identities required');
    ids.add(q.item_id);keys.add(q.editorial_key);
    assert.equal(q.slot,r.slot);assert.equal(q.version,old.version+1);
    assert.equal(q.review_status,'draft');assert.equal(q.reviewer,null);
    assert.equal(q.safety_privacy_review_required,true);assert.equal(q.safety_privacy_reviewer,null);
    assert(r.source_ids.length&&r.source_ids.every(id=>sources.has(id)));
    candidate.forms[r.phase].items=candidate.forms[r.phase].items.map(item=>item.slot===r.slot?structuredClone(q):item);
  }
  for(const phase of ['pretest','posttest']){
    candidate.forms[phase].form_id=`${p.proposed_release_id}-${phase}`;
    candidate.forms[phase].hash=fullFormHash(candidate.forms[phase].items);
  }
  assert.deepEqual(validateRelease(candidate,context).sort(),[
    'release scope, identity, approval or comparability status is invalid',
    ...['pretest','posttest'].flatMap(phase=>['T08','T09'].flatMap(slot=>[
      `${phase} ${slot}: missing approval metadata`,`${phase} ${slot}: missing safety/privacy review`,
    ])),
  ].sort());
  return candidate;
}

export function renderGiftsLactationReview(base,p){
  const lines=['# FB-2.4 — gifts, conflicts and lactation facilities','','**Draft for bilingual, policy and assessment review.** No content approval, import or activation is claimed.','',
    p.scope_note,'','This draft is based on the approved CSC v3 artifact. Its live activation is verified separately; authoring does not change enrollment assignment. T08 covers infant-formula promotional inducements. T09 covers a suitable lactation facility. It avoids a contrastive question combining different laws.',''];
  for(const r of p.replacements){
    lines.push(`## ${r.phase} ${r.slot}`,'',`Proposed identity: \`${r.item.item_id}\`, version ${r.item.version}.`);
    for(const lang of ['en','fil']){
      lines.push('',`### ${lang}`,'','**Current stem**','',base.forms[r.phase].items.find(q=>q.slot===r.slot).stem[lang],'','**Proposed stem**','',r.item.stem[lang],'');
      for(const o of r.item.options){
        lines.push(`- **${o.id}${o.id===r.item.correct_option_id?' — proposed correct answer':''}:** ${o.label[lang]}`);
        if(o.distractor_rationale)lines.push(`  Explanation: ${o.distractor_rationale[lang]}`);
      }
      lines.push('','**Rationale:**','',r.item.rationale[lang],'');
    }
  }
  lines.push('## Sources','');for(const s of p.sources)lines.push(`- [${s.id}](${s.url}): ${s.locators.join('; ')}.`);
  lines.push('','## Review and release checks','',
    '- Confirm both languages, reading load, plausible options and the source-supported restriction in each scenario.',
    '- Check the actual or apparent conflict explanation without teaching that every gift in every context is prohibited.',
    '- Keep infant-formula promotion separate from pharmaceutical promotion; the latter requires separate source review.',
    '- Review facility wording and scope: the BHW proposes and verifies with the responsible team; she does not certify compliance or authorize spending. The full requirements and any formal exemption process remain with the responsible authorities.',
    '- Retain the original legacy answer keys and saved scores. The two legacy reports motivate future shared-form wording, not retroactive accepted-key additions.',
    '- Record actual content approval before a separate versioned release; preserve existing enrollments for both phases, drafts and submitted snapshots. Comparability remains unvalidated.','',
    'The other 56 form items, including approved UHC T05 and accreditation T11, all 48 checkpoint items and all curriculum pins remain exact copies. There is no database operation in the local authoring command.','',
    'Reproduce with `node scripts/feedback-gifts-lactation-proposal.mjs --review`; export a complete draft with `--output /tmp/fb-2.4-candidate.json`.');
  return lines.join('\n')+'\n';
}
