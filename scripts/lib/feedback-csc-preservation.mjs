// Exact predecessor views for historical audit checks. Current loaders read disk.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const sha = b => createHash('sha256').update(b).digest('hex');
const leaf = 'content/training/day1-basic-competencies/modules/04-ra7883/lessons/bhw-eligibility/';
const narration = 'content/training/day1-basic-competencies/narration.json';
let receipt;
const cache=new Map();
export function beforeFeedbackCsc(path, actual = fs.readFileSync(path)) {
  const r = receipt ??= JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-2.3-preservation.json'));
  if (r.target !== 'bhw-eligibility' || Object.keys(r.changed_existing_files).some(p =>
    ![...['lesson.json', 'read.en.md', 'read.fil.md', 'slides.json'].map(f => leaf + f), narration,'scripts/tests/lesson-173.test.mjs'].includes(p)))
    throw Error('Invalid FB-2.3 preservation scope');
  const e = r.changed_existing_files[path]; if (!e) return actual;
  const stat=fs.statSync(path,{bigint:true}),signature=`${stat.ino}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`;
  let entry=cache.get(path);
  if(!entry||entry.signature!==signature){
    const bytes=fs.readFileSync(path),disk=sha(bytes);
    if (![e.proposed_sha256, e.predecessor_sha256].includes(disk)) throw Error('Unpinned integrated successor (FB-2.3): ' + path);
    entry={signature,bytes,disk};cache.set(path,entry);
  }
  if(entry.disk!==e.proposed_sha256||!(Buffer.isBuffer(actual)?actual:Buffer.from(actual)).equals(entry.bytes))return actual;
  if(entry.previous)return entry.previous;
  let previous;
  if (path === narration) {
    let text = actual.toString('utf8');
    for (const change of e.replacements) {
      if (text.indexOf(change.current_utf8) < 0 || text.indexOf(change.current_utf8) !== text.lastIndexOf(change.current_utf8))
        throw Error('Ambiguous FB-2.3 narration predecessor fragment');
      text = text.replace(change.current_utf8, () => change.predecessor_utf8);
    }
    previous = Buffer.from(text);
  } else previous = Buffer.from(e.predecessor_utf8);
  if (sha(previous) !== e.predecessor_sha256) throw Error('Corrupt FB-2.3 predecessor: ' + path);
  entry.previous=previous;
  return previous;
}
