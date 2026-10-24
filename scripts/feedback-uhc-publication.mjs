import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { loadLessonMap } from './lib/chapter1-assessment-content.mjs';
import { buildApprovedUhcRelease, publishUhcSql } from './lib/feedback-uhc-publication.mjs';
import { releaseHash } from './lib/feedback-uhc-proposal.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = join(root, 'content/training/day1-basic-competencies/learner-assessment-v2');
const read = path => JSON.parse(readFileSync(join(source, path), 'utf8'));
const base = read('release.json');
const proposal = read('proposals/fb-2.2a-uhc/proposal.json');
const approval = read('releases/chapter1-feedback-uhc-v2/approval-record.json');
const context = { ...loadLessonMap(root), orientation: read('orientation.json') };
const release = buildApprovedUhcRelease(base, proposal, approval, context);
assert.deepEqual(release, read('releases/chapter1-feedback-uhc-v2/release.json'), 'Checked-in approved release drift');
assert(process.argv.slice(2).every(arg => arg === '--sql'), 'Only --sql is supported; this command never connects to a database');
process.stdout.write(process.argv.includes('--sql') ? publishUhcSql(base, release) :
  `Approved ${release.release_id}; SHA-256 ${releaseHash(release)}\nOwner: ${approval.reviewer}; comparability unvalidated.\nUse --sql to print the guarded publication transaction for deliberate execution.\n`);
