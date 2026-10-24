// Exact predecessor view for historical release guards. The application uses
// current source; no lesson, release or historical approval hash is rewritten.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const target = 'src/components/elearning/reference-lessons.tsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let receipt;
export function beforeFeedbackVisualLabel(path, actual = fs.readFileSync(path)) {
  if (path !== target) return actual;
  const r = receipt ??= JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-4.1b-reader-preservation.json'));
  if (r.path !== target || r.replacements.length !== 2) throw Error('Invalid FB-4.1b reader scope');
  const disk = sha(fs.readFileSync(path));
  if (![r.predecessor_sha256, r.successor_sha256].includes(disk)) throw Error('Unpinned integrated successor (FB-4.1b): ' + path);
  if (sha(actual) !== r.successor_sha256) return actual;
  let previous = actual.toString('utf8');
  for (const change of r.replacements) {
    if (!previous.includes(change.current_utf8) || previous.indexOf(change.current_utf8) !== previous.lastIndexOf(change.current_utf8))
      throw Error('Ambiguous FB-4.1b predecessor fragment');
    previous = previous.replace(change.current_utf8, () => change.predecessor_utf8);
  }
  const bytes = Buffer.from(previous);
  if (sha(bytes) !== r.predecessor_sha256) throw Error('Corrupt FB-4.1b predecessor');
  return bytes;
}
