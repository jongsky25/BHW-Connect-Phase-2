import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha = b => createHash('sha256').update(b).digest('hex');
const baseline = JSON.parse(fs.readFileSync('docs/lesson-172-implementation-baseline.json'));
const changed_existing_files = {};
for (const [path, hash] of Object.entries(baseline.protected_files)) {
  const current = fs.readFileSync(path);
  if (sha(current) === hash) continue;
  const prior = execFileSync('git', ['show', baseline.integrated_main + ':' + path]);
  if (sha(prior) !== hash) throw Error('Baseline bytes mismatch: ' + path);
  changed_existing_files[path] = {predecessor_sha256: hash, predecessor_utf8: prior.toString(), proposed_sha256: sha(current)};
}
fs.writeFileSync('docs/lesson-172-proposal-receipt.json', JSON.stringify({status:'Draft; no owner approval', baseline:baseline.integrated_main, changed_existing_files}, null, 2) + '\n');
