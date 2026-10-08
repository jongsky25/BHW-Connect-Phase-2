import {beforeProposed162} from './lesson-162-proposal-compat.mjs';
// Exact successor/predecessor bridge for historical release guards. No approval claim.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const allowed=new Set(['remotion/src/Root.tsx','scripts/lib/reference-narration.mjs','scripts/lib/tts-providers/gemini.mjs','src/components/elearning/reference-lessons.tsx','content/training/day1-basic-competencies/narration.json']);
const receipt=JSON.parse(fs.readFileSync(path.join(root,'docs/lesson-161-proposal-receipt.json'),'utf8'));
export function beforeProposed161(p){
 const actual=beforeProposed162(p);
 const e=receipt.changed_existing_files[p];if(!e)return actual;
 if((!allowed.has(p)&&!p.startsWith('content/training/day1-basic-competencies/modules/06-komunikasyon/'))||receipt.status!=='draft'||receipt.owner_release_approval!==false)throw Error('Invalid 1.6.1 predecessor scope');
 if(sha(actual)!==e.proposed_sha256){
  const approval=JSON.parse(fs.readFileSync(path.join(root,'docs/lesson-161-owner-approval.json'),'utf8'));
  if(approval.interpreted_authorization!=='merge and deploy to live'||approval.reviewed_proposal_receipt_sha256!==sha(fs.readFileSync(path.join(root,'docs/lesson-161-proposal-receipt.json')))||approval.reviewed_source_sha256[p]!==e.proposed_sha256||approval.approved_source_sha256[p]!==sha(actual))throw Error('Unapproved 1.6.1 successor: '+p);
 }
 const predecessor=Buffer.from(e.predecessor_utf8,'utf8');
 if(sha(predecessor)!==e.predecessor_sha256)throw Error('Corrupt 1.6.1 predecessor: '+p);
 return predecessor;
}
