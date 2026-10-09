import {release172View} from './lesson-172-release-integration.mjs';
// Exact-byte predecessor view for immutable historical review assertions.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = JSON.parse(fs.readFileSync('docs/lesson-172-proposal-receipt.json'));
export function beforeLesson172(path, actual = fs.readFileSync(path)) {
  actual = release172View(path, "reviewed172", actual);
  const entry = receipt.changed_existing_files[path];
  if (!entry) return actual;
  if (sha(actual) === entry.predecessor_sha256) return actual;
  if (sha(actual) !== entry.proposed_sha256) throw Error('Unpinned integrated successor (lesson 1.7.2): ' + path);
  const predecessor = Buffer.from(entry.predecessor_utf8);
  if (sha(predecessor) !== entry.predecessor_sha256) throw Error('Corrupt lesson 1.7.2 predecessor: ' + path);
  return predecessor;
}
