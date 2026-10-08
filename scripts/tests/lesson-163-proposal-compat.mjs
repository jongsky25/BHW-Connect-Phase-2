// Validate exact proposed bytes BEFORE supplying historical guards their pinned predecessor.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const shared=new Set(['remotion/src/Root.tsx','scripts/lib/reference-narration.mjs','scripts/lib/tts-providers/gemini.mjs','content/training/day1-basic-competencies/narration.json']);
const leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-explain/';
export function beforeProposed163(p){
 const actual=fs.readFileSync(path.join(root,p));
 const receipt=JSON.parse(fs.readFileSync(path.join(root,'docs/lesson-163-proposal-receipt.json'))),e=receipt.changed_existing_files[p];
 if(!e)return actual;
 if(receipt.status!=='draft'||receipt.owner_release_approval!==false||receipt.predecessor_sha!=='27d4752324f4fd50183fcb60a408e537cc784ae4'||(!shared.has(p)&&!p.startsWith(leaf)))throw Error('Invalid 1.6.3 proposal scope');
 if(sha(actual)!==e.proposed_sha256)throw Error('Unpinned 1.6.3 successor: '+p);
 const prior=Buffer.from(e.predecessor_utf8);if(sha(prior)!==e.predecessor_sha256)throw Error('Corrupt 1.6.3 predecessor: '+p);
 return prior;
}
