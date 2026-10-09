// Exact-byte predecessor view for immutable historical review assertions.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function beforeLesson172(path, actual = fs.readFileSync(path)) {
  const receipt = JSON.parse(fs.readFileSync('docs/lesson-172-proposal-receipt.json'));
  const entry = receipt.changed_existing_files[path];
  if (!entry) return actual;
  if (sha(actual) !== entry.proposed_sha256) throw Error('Unpinned lesson 1.7.2 successor: ' + path);
  const predecessor = Buffer.from(entry.predecessor_utf8);
  if (sha(predecessor) !== entry.predecessor_sha256) throw Error('Corrupt lesson 1.7.2 predecessor: ' + path);
  return predecessor;
}
