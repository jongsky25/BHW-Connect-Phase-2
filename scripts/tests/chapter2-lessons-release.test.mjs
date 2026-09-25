// @vitest-environment node
import { test } from 'vitest';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadReferenceModule } from '../lib/reference-content.mjs';
import { chapter2Root } from '../lib/chapter2-module-guide.mjs';
import { planRelease, releasableRevision } from '../chapter2-lessons-release.mjs';

const load = (key) => structuredClone(loadReferenceModule(path.join(chapter2Root, 'drafts', key), path.resolve(chapter2Root, '../../../public')));

function liveFrom(m, mutate = (r) => r) {
  const lessons = [], revisions = {}, notes = {};
  m.lessons.forEach((l, i) => {
    const rev = mutate({ id: `rev-${i}`, lesson_id: `lesson-${i}`, ...releasableRevision(l.revision, l.revision.assets.filter((a) => !a.video).map((a) => ({ ...a, review_status: 'approved' }))) }, l);
    revisions[rev.id] = rev;
    notes[rev.id] = { revision_id: rev.id, ...l.notes };
    lessons.push({ id: `lesson-${i}`, ...l.manifest, published_revision_id: rev.id });
  });
  return { lessons, revisions, notes, byHash: {} };
}

test('draft-only media is never released and its references are stripped', () => {
  const lesson = load('03-infection-control').lessons.find((l) => l.manifest.lesson_key === 'hand-hygiene');
  assert.ok(lesson.revision.assets.some((a) => a.video), 'fixture carries the unreleased clip');
  const live = lesson.revision.assets.filter((a) => !a.video).map((a) => ({ ...a, review_status: 'approved' }));
  const out = releasableRevision(lesson.revision, live);
  assert.deepEqual(out.assets.map((a) => a.id), live.map((a) => a.id));
  assert.ok(out.assets.every((a) => a.review_status === 'approved' && !a.video));
  const ids = new Set(live.map((a) => a.id));
  for (const s of [...out.read_sections, ...out.slides]) assert.ok(s.asset_ids.every((id) => ids.has(id)));
});

test('matching drafts plan no change; an edited Read section creates a revision', () => {
  const m = load('06-community-mobilization');
  assert.ok(planRelease(m, liveFrom(m)).entries.every((e) => e.action === 'unchanged'));
  const edited = structuredClone(m);
  edited.lessons[2].revision.read_sections[0].body_en += ' Edited.';
  const plan = planRelease(edited, liveFrom(m));
  assert.equal(plan.publish, true);
  assert.equal(plan.entries[2].action, 'create');
  assert.deepEqual(plan.entries[2].changed, ['read_sections']);
});

test('refuses lesson metadata drift', () => {
  const m = load('06-community-mobilization');
  const live = liveFrom(m);
  live.lessons[1].title_fil = 'Iba';
  assert.throws(() => planRelease(m, live), /lesson metadata title_fil/);
});
