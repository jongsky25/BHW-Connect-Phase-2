// @vitest-environment node
import { test } from 'vitest';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadReferenceModule } from '../lib/reference-content.mjs';
import { chapter2Root } from '../lib/chapter2-module-guide.mjs';
import { planRelease, releasableRevision } from '../chapter2-lessons-release.mjs';

const load = (key) => structuredClone(loadReferenceModule(path.join(chapter2Root, 'drafts', key), path.resolve(chapter2Root, '../../../public')));
const isClip = (a) => Boolean(a.video || a.videos);

function liveFrom(m, mutate = (r) => r) {
  const lessons = [], revisions = {}, notes = {};
  m.lessons.forEach((l, i) => {
    const rev = mutate({ id: `rev-${i}`, lesson_id: `lesson-${i}`, ...releasableRevision(l.revision, l.revision.assets.filter((a) => !isClip(a)).map((a) => ({ ...a, review_status: 'approved' }))) }, l);
    revisions[rev.id] = rev;
    notes[rev.id] = { revision_id: rev.id, ...l.notes };
    lessons.push({ id: `lesson-${i}`, ...l.manifest, published_revision_id: rev.id });
  });
  return { lessons, revisions, notes, byHash: {} };
}

test('draft-only media is never released and its references are stripped', () => {
  const lesson = load('03-infection-control').lessons.find((l) => l.manifest.lesson_key === 'hand-hygiene');
  assert.ok(lesson.revision.assets.some(isClip), 'fixture carries the unreleased clip');
  const live = lesson.revision.assets.filter((a) => !isClip(a)).map((a) => ({ ...a, review_status: 'approved' }));
  const out = releasableRevision(lesson.revision, live);
  assert.deepEqual(out.assets.map((a) => a.id), live.map((a) => a.id));
  assert.ok(out.assets.every((a) => a.review_status === 'approved' && !isClip(a)));
  assert.equal(out.featured_asset_id, null, 'an unreleased featured clip is not referenced');
  const ids = new Set(live.map((a) => a.id));
  for (const s of [...out.read_sections, ...out.slides]) assert.ok(s.asset_ids.every((id) => ids.has(id)));
});

test('a narrated clip replaces a clip that is already live, and never lands on a live image', () => {
  const lesson = load('03-infection-control').lessons.find((l) => l.manifest.lesson_key === 'hand-hygiene');
  const draft = lesson.revision.assets.find((a) => a.videos);
  assert.ok(draft, 'fixture carries the narrated clip');
  const silent = { ...draft, review_status: 'approved', videos: undefined,
    video: { path: '/training/x-2f831aea2a9b.mp4', content_hash: '2f831aea2a9b'.padEnd(64, '0'), duration_s: 27 } };
  const out = releasableRevision(lesson.revision, [silent]).assets.find((a) => a.id === draft.id);
  assert.deepEqual(out.videos, draft.videos);
  assert.equal('video' in out, false);
  assert.equal(out.review_status, 'approved');
  const image = { ...draft, review_status: 'approved', videos: undefined };
  const asImage = releasableRevision(lesson.revision, [image]).assets.find((a) => a.id === draft.id);
  assert.equal(isClip(asImage), false);
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
