import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { loadLessonMap } from './lib/chapter1-assessment-content.mjs';
import { buildApprovedGiftsLactationRelease, publishGiftsLactationSql } from './lib/feedback-gifts-lactation-publication.mjs';
import { releaseHash } from './lib/feedback-uhc-proposal.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = join(root, 'content/training/day1-basic-competencies/learner-assessment-v2');
const read = path => JSON.parse(readFileSync(join(dir, path), 'utf8'));
const target = 'releases/chapter1-feedback-gifts-lactation-v4';
const base = read('releases/chapter1-feedback-accreditation-csc-v3/release.json');
const proposal = read('proposals/fb-2.4-gifts-lactation/proposal.json');
const approval = read(`${target}/approval-record.json`);
const release = buildApprovedGiftsLactationRelease(base, proposal, approval,
  { ...loadLessonMap(root), orientation: read('orientation.json') });
assert.deepEqual(release, read(`${target}/release.json`), 'Approved release snapshot drift');
assert(process.argv.slice(2).every(arg => arg === '--sql'), 'Only --sql is supported; no database connection is made');
process.stdout.write(process.argv.includes('--sql') ? publishGiftsLactationSql(base, release) :
  `Approved ${release.release_id}; SHA-256 ${releaseHash(release)}\nFour new item identities; 56 other form items, 48 checkpoint items and 42 curriculum pins unchanged.\nOwner: ${approval.reviewer}; independent specialist approval not claimed; comparability unvalidated.\n`);
