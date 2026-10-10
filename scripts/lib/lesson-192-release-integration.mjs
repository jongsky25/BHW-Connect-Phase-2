// Only an exact owner-approved asset-status successor may expose the reviewed draft.
import fs from 'node:fs';import {createHash} from 'node:crypto';
const leaf='content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-safe-change/lesson.json';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function reviewed192View(p,actual=fs.readFileSync(p)){
 if(p!==leaf)return actual;
 const a=JSON.parse(fs.readFileSync('docs/lesson-192-owner-approval.json'));
 if(a.authorization!=='approved. merge and deploy to live'||a.lesson_keys.length!==1||a.lesson_keys[0]!=='resources-safe-change')throw Error('Invalid 1.9.2 release authorization');
 if(sha(actual)===a.reviewed_lesson_sha256)return actual;
 if(sha(actual)!==a.approved_lesson_sha256)throw Error('Unpinned lesson 1.9.2 release successor');
 const old=Buffer.from(a.reviewed_lesson_utf8);if(sha(old)!==a.reviewed_lesson_sha256)throw Error('Corrupt reviewed 1.9.2 lesson');
 const current=JSON.parse(actual);if(current.assets.length!==8||current.assets.some(x=>x.review_status!=='approved'))throw Error('Invalid asset promotion');
 const reviewed=JSON.parse(old);for(const asset of current.assets)asset.review_status=reviewed.assets.find(x=>x.id===asset.id)?.review_status;
 if(JSON.stringify(current)!==JSON.stringify(JSON.parse(old)))throw Error('Release exceeds approved asset-status promotion');
 return old;
}
