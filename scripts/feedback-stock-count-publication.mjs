import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { loadLessonMap } from './lib/chapter1-assessment-content.mjs';
import { buildApprovedStockCountRelease, publishStockCountSql } from './lib/feedback-stock-count-publication.mjs';
import { releaseHash } from './lib/feedback-uhc-proposal.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = join(root, 'content/training/day1-basic-competencies/learner-assessment-v2');
const target = 'releases/chapter1-feedback-stock-count-v5';
const read = path => JSON.parse(readFileSync(join(dir, path), 'utf8'));
const base = read('releases/chapter1-feedback-gifts-lactation-v4/release.json');
const proposal = read(`${target}/proposal.json`);
const approval = read(`${target}/approval-record.json`);
const reviewed = readFileSync(join(root, approval.review_record), 'utf8');
for (const language of ['en', 'fil']) assert(reviewed.includes(proposal.stem[language]), 'Approved review copy drift');
const release = buildApprovedStockCountRelease(base, proposal, approval,
  { ...loadLessonMap(root), orientation: read('orientation.json') });
assert.deepEqual(release, read(`${target}/release.json`), 'Approved release snapshot drift');
assert(process.argv.slice(2).every(arg => arg === '--sql'), 'Only --sql is supported; no database connection is made');
process.stdout.write(process.argv.includes('--sql') ? publishStockCountSql(base, release) :
  `Approved ${release.release_id}; SHA-256 ${releaseHash(release)}\n` +
  'One new pretest item identity; 59 other form items, 48 checkpoint items and 42 curriculum pins unchanged.\n' +
  'Existing enrollments and historical attempts remain pinned; comparability unvalidated.\n');
