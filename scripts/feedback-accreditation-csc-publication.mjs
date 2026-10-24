import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { contentHash, loadReferenceModule } from './lib/reference-content.mjs';
import { loadAccreditationCscInputs } from './lib/feedback-accreditation-csc-proposal.mjs';
import { buildApprovedAccreditationCscRelease, accreditationCscPublicationSql } from './lib/feedback-accreditation-csc-publication.mjs';
import { releaseHash } from './lib/feedback-uhc-proposal.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = join(root, 'content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-accreditation-csc-v3');
const read = path => JSON.parse(readFileSync(join(dir, path), 'utf8'));
const inputs = loadAccreditationCscInputs(root), approval = read('approval-record.json'), identity = read('lesson-identity.json');
const lesson = loadReferenceModule(join(root, 'content/training/day1-basic-competencies/modules/04-ra7883'), join(root, 'public'))
  .lessons.find(l => l.manifest.lesson_key === 'bhw-eligibility');
const release = buildApprovedAccreditationCscRelease(inputs, approval, lesson, identity);
assert.deepEqual(release, read('release.json'), 'Approved release snapshot drift');
assert.deepEqual(lesson, read('lesson.json'), 'Approved lesson snapshot drift');
assert(process.argv.slice(2).every(arg => arg === '--sql'), 'Only --sql is supported; no database connection is made');
process.stdout.write(process.argv.includes('--sql') ? accreditationCscPublicationSql(inputs, approval, lesson, identity, release, read('criterion-baseline.json')) :
  `Approved ${release.release_id}; SHA-256 ${releaseHash(release)}\nLesson revision ${identity.revision_id}; SHA-256 ${contentHash(lesson)}\nOwner: ${approval.reviewer}; automation: ${approval.publication_account}; comparability unvalidated.\nChanged/new section narration is withheld after HTTP 403; old revision audio remains in history.\n`);
