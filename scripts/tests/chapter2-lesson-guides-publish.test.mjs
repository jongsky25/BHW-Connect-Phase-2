// @vitest-environment node
import { test } from 'vitest';
import assert from 'node:assert/strict';
import path from 'node:path';
import { canonical, contentHash, loadReferenceModule } from '../lib/reference-content.mjs';
import { chapter2Root } from '../lib/chapter2-module-guide.mjs';
import { planModule } from '../chapter2-lesson-guides-publish.mjs';

const mod = () => structuredClone(loadReferenceModule(path.join(chapter2Root, 'drafts/06-community-mobilization'), path.resolve(chapter2Root, '../../../public')));

// Live rows shaped like the database: published revision + notes per lesson,
// notes stored with CRLF as the original publication did.
function liveFrom(m) {
  const lessons = [], revisions = {}, notes = {};
  m.lessons.forEach((l, i) => {
    const rev = { id: `rev-${i}`, lesson_id: `lesson-${i}`, content_hash: `old-${i}`, ...structuredClone(l.revision) };
    rev.assets = rev.assets.map((a) => ({ ...a, review_status: 'approved' }));
    revisions[rev.id] = rev;
    notes[rev.id] = { revision_id: rev.id, observation_indicators: l.notes.observation_indicators, notes_fil: l.notes.notes_fil.replace(/\n/g, '\r\n'), notes_en: l.notes.notes_en.replace(/\n/g, '\r\n') };
    lessons.push({ id: `lesson-${i}`, ...l.manifest, published_revision_id: rev.id });
  });
  return { lessons, revisions, notes, byHash: {} };
}

test('identical notes (up to line endings) leave every lesson unchanged', () => {
  const m = mod();
  const plan = planModule(m, liveFrom(m));
  assert.equal(plan.publish, false);
  assert.ok(plan.entries.every((e) => e.action === 'unchanged'));
});

test('changed notes create a revision whose learner content is the live revision, not the draft', () => {
  const m = mod();
  const live = liveFrom(m);
  live.revisions['rev-0'].read_sections[0].body_en = 'Live wording that differs from the draft';
  m.lessons[0].notes.notes_en = m.lessons[0].notes.notes_en.replace('## [purpose] Purpose', '## [purpose] Purpose\n\nRewritten.');
  const plan = planModule(m, live);
  const [first, ...rest] = plan.entries;
  assert.equal(plan.publish, true);
  assert.equal(first.action, 'create');
  assert.equal(first.lesson.revision.read_sections[0].body_en, 'Live wording that differs from the draft');
  assert.ok(first.lesson.revision.assets.every((a) => a.review_status === 'approved'));
  assert.equal(canonical(first.lesson.notes.notes_en), canonical(m.lessons[0].notes.notes_en));
  assert.equal(first.hash, contentHash(first.lesson));
  assert.equal(first.from, 'rev-0');
  assert.ok(rest.every((e) => e.action === 'unchanged'));
});

test('an interrupted run reuses the revision already inserted for the same hash', () => {
  const m = mod();
  m.lessons[1].notes.notes_fil += '\nDagdag.';
  const live = liveFrom(m);
  live.notes['rev-1'].notes_fil = 'old';
  const hash = planModule(m, live).entries[1].hash;
  live.byHash[`lesson-1:${hash}`] = { id: 'rev-1b' };
  const entry = planModule(m, live).entries[1];
  assert.equal(entry.action, 'reuse');
  assert.equal(entry.revisionId, 'rev-1b');
});

test('refuses when live lesson metadata or lesson set differs from the package', () => {
  const m = mod();
  const live = liveFrom(m);
  live.lessons[0].title_en = 'Renamed live';
  assert.throws(() => planModule(m, live), /lesson metadata title_en differs/);
  const live2 = liveFrom(m);
  live2.lessons.pop();
  assert.throws(() => planModule(m, live2), /live lessons differ/);
});
