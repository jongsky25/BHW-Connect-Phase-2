// Exact predecessor view for historical release guards. The application uses
// current source; no lesson, release or historical approval hash is rewritten.
import fs from 'node:fs';
import {beforeFeedbackNarrationPreferences} from './feedback-narration-preservation.mjs';
import {createHash} from 'node:crypto';
const target = 'src/components/elearning/reference-lessons.tsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let receipt;
export function beforeFeedbackHepoPresentation(path, actual = fs.readFileSync(path)) {
  actual = beforeFeedbackNarrationPreferences(path, actual);
  if (path !== target) return actual;
  const r = receipt ??= JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-4.1g-reader-preservation.json'));
  if (r.path !== target || r.replacements.length !== 9) throw Error('Invalid FB-4.1g reader scope');
  const disk = sha(beforeFeedbackNarrationPreferences(path));
  if (![r.predecessor_sha256, r.successor_sha256].includes(disk)) throw Error('Unpinned integrated successor (FB-4.1g): ' + path);
  if (sha(actual) !== r.successor_sha256) return actual;
  let previous = actual.toString('utf8');
  for (const change of r.replacements) {
    if (previous.split(change.current_utf8).length - 1 !== change.count)
      throw Error('Ambiguous FB-4.1g predecessor fragment');
    previous = previous.split(change.current_utf8).join(change.predecessor_utf8);
  }
  const bytes = Buffer.from(previous);
  if (sha(bytes) !== r.predecessor_sha256) throw Error('Corrupt FB-4.1g predecessor');
  return bytes;
}
