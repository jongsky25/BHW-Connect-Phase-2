// Read-only local check against the recorded FB-2.1a pilot observation.
// This does not refresh live state or establish clinical/editorial approval.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { contentHash, loadReferenceModule } from './lib/reference-content.mjs';
import { fullFormHash } from './lib/chapter1-assessment-content.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
const audit = read('docs/feedback-remediation/uhc-audit-2026-10-23.json');
const referenceModule = loadReferenceModule(join(root, 'content/training/day1-basic-competencies/modules/02-uhc-act'), join(root, 'public'));
for (const observed of audit.lessons) {
  const lesson = referenceModule.lessons.find(l => l.manifest.lesson_key === observed.lesson_key);
  assert(lesson, `Missing lesson ${observed.lesson_key}`);
  assert.equal(contentHash(lesson), observed.content_hash, `${observed.lesson_key}: differs from the observed publication`);
}
const release = read('content/training/day1-basic-competencies/learner-assessment-v2/release.json');
assert.equal(release.release_id, audit.assessment_release_id);
for (const observed of audit.forms) {
  const form = release.forms[observed.phase];
  assert.equal(form.form_id, observed.form_id);
  assert.equal(form.items.length, observed.item_count);
  assert.equal(fullFormHash(form.items), observed.form_hash, `${observed.phase}: differs from the observed form`);
  assert.equal(form.hash, observed.form_hash);
  for (const [key, id] of Object.entries(observed.audited_items)) {
    assert(form.items.some(item => item.editorial_key === key && item.item_id === id), `Missing audited item ${key}`);
  }
}
const tracker = readFileSync(join(root, 'docs/feedback-remediation/triage-2026-10-23.csv'), 'utf8');
const ids = tracker.match(/^[0-9a-f-]{36}(?=,)/gm) ?? [];
assert.equal(ids.length, 214);
assert.equal(new Set(ids).size, 214);
const findings = audit.findings.map(f => f.feedback_id);
assert.equal(findings.length, 7);
assert.equal(new Set(findings).size, findings.length);
for (const id of findings) assert(ids.includes(id), `Untracked finding ${id}`);
console.log(JSON.stringify({ audit_id: audit.audit_id, recorded_at: audit.observed_at,
  local_matches_recorded_publication: true, lessons: audit.lessons.length,
  forms: audit.forms.length, findings: findings.length, feedback_ids_retained: ids.length,
  live_state_refreshed: false, independent_clinical_approval: false }, null, 2));
