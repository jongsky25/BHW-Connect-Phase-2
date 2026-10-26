// Exact predecessor view for historical release guards. The application uses
// current source; no lesson, release or historical approval hash is rewritten.
import fs from 'node:fs';
import {beforeFeedbackLanguageAvailability} from './feedback-language-preservation.mjs';
import {createHash} from 'node:crypto';
const target = 'src/components/elearning/reference-lessons.tsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// Only exact, SHA-validated transformations are memoized. Current disk bytes
// still pass the upstream guard and an exact byte/allowlist check on every call.
let receipt, successor, predecessor;
function pinSuccessor(input, r) {
  let previous = input.toString('utf8');
  for (const change of r.replacements) {
    if (previous.split(change.current_utf8).length - 1 !== change.count)
      throw Error('Ambiguous FB-4.2b predecessor fragment');
    previous = previous.split(change.current_utf8).join(change.predecessor_utf8);
  }
  const restored = Buffer.from(previous);
  if (sha(restored) !== r.predecessor_sha256) throw Error('Corrupt FB-4.2b predecessor');
  successor = Buffer.from(input);
  predecessor = restored;
}
export function beforeFeedbackNarratedLesson(path, actual = fs.readFileSync(path)) {
  actual = beforeFeedbackLanguageAvailability(path, actual);
  if (path !== target) return actual;
  const r = receipt ??= JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-4.2b-reader-preservation.json'));
  if (r.path !== target || r.replacements.length !== 8) throw Error('Invalid FB-4.2b reader scope');
  const disk = beforeFeedbackLanguageAvailability(path);
  if (!disk.equals(successor ?? Buffer.alloc(0)) && !disk.equals(predecessor ?? Buffer.alloc(0))) {
    const hash = sha(disk);
    if (hash === r.successor_sha256) pinSuccessor(disk, r);
    else if (hash === r.predecessor_sha256) predecessor = Buffer.from(disk);
    else throw Error('Unpinned integrated successor (FB-4.2b): ' + path);
  }
  const input = Buffer.isBuffer(actual) ? actual : Buffer.from(actual);
  // Never expose the private cached bytes: callers receive an independent copy.
  if (successor && input.equals(successor)) return Buffer.from(predecessor);
  if (!successor && sha(input) === r.successor_sha256) {
    pinSuccessor(input, r);
    return Buffer.from(predecessor);
  }
  return actual;
}
