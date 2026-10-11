// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fullFormHash, loadLessonMap, validateOrientation, validateRelease } from '../lib/chapter1-assessment-content.mjs';

const root = new URL('../../', import.meta.url);
const map = loadLessonMap(new URL('.', root).pathname);
const orientation = JSON.parse(readFileSync(new URL('content/training/day1-basic-competencies/learner-assessment-v2/orientation.json', root)));
const draft = { ...orientation, editorial_status: 'draft' };
const draftBank = JSON.parse(readFileSync(new URL('content/training/day1-basic-competencies/learner-assessment-v2/draft-items.json', root)));
const published = JSON.parse(readFileSync(new URL('content/training/day1-basic-competencies/learner-assessment-v2/release.json', root)));
const approvedOrientation = { ...orientation, editorial_status: 'approved' };
const text = { en: 'Reviewed English text', fil: 'Nasuring tekstong Filipino' };

function makeItem(target, lessonKey) {
  return {
    item_id: randomUUID(), editorial_key: randomUUID(), version: 1, target,
    stem: text, rationale: text, lesson_keys: [lessonKey],
    source: 'approved lesson revision', reviewer: 'content reviewer', review_status: 'approved',
    options: ['a', 'b', 'c'].map(id => ({ id, label: text,
      ...(id === 'a' ? {} : { distractor_rationale: text }) })), correct_option_id: 'a',
  };
}

function release() {
  const forms = Object.fromEntries(['pretest', 'posttest'].map(phase => {
    const items = Array.from({ length: 30 }, (_, i) => {
      const slot = `T${String(i + 1).padStart(2, '0')}`;
      return { ...makeItem(slot, map.slotTargets[slot]), slot };
    });
    return [phase, { form_id: phase, items, hash: fullFormHash(items) }];
  }));
  const checkpoints = Array.from({ length: 12 }, (_, i) => {
    const key = `G${String(i + 1).padStart(2, '0')}`;
    const lesson = map.boundaries[key];
    return { key, after_lesson_key: lesson,
      first: [makeItem(key, lesson), makeItem(key, lesson)],
      alternates: [makeItem(key, lesson), makeItem(key, lesson)] };
  });
  return { release_id: 'test-release', blueprint_id: 'chapter-1-v2', source_commit: '5bb7c096',
    program_key: 'bhw-reference-manual', chapter_key: 'chapter-1', publication_status: 'approved',
    comparability_status: 'unvalidated',
    curriculum_revisions: map.lessonKeys.map(lesson_key => ({ lesson_key, revision_id: randomUUID(), sha256: 'a'.repeat(64) })),
    forms, checkpoints };
}

describe('Chapter 1 release contract', () => {
  it('validates the reviewed release and its pinned curriculum', () => {
    expect(validateRelease(published, { ...map, orientation })).toEqual([]);
    expect(published.curriculum_revisions).toHaveLength(42);
    expect(published.forms.pretest.items).toHaveLength(30);
    expect(published.forms.posttest.items).toHaveLength(30);
    expect(published.checkpoints.flatMap(group => [...group.first, ...group.alternates])).toHaveLength(48);
  });
  it('keeps 108 distinct bilingual working items separate from approved content', () => {
    const items = [...draftBank.forms.pretest.items, ...draftBank.forms.posttest.items,
      ...draftBank.checkpoints.flatMap(group => [...group.first, ...group.alternates])];
    expect(items).toHaveLength(108);
    expect(new Set(items.map(item => item.item_id)).size).toBe(108);
    expect(items.every(item => item.review_status === 'draft' && item.stem.en && item.stem.fil)).toBe(true);
    expect(items.every(item => item.options.filter(option => option.id !== item.correct_option_id)
      .every(option => option.distractor_rationale?.en && option.distractor_rationale?.fil))).toBe(true);
    expect(draftBank.checkpoints[6].first[1].options.find(option => option.id === 'o1').label.en)
      .toContain('school');
    expect(draftBank.checkpoints.map(group => group.key)).toEqual(Object.keys(map.boundaries));
    expect(validateRelease(draftBank, { ...map, orientation: draft })).not.toEqual([]);
  });
  it('has all nine complete bilingual introductions and the 42/30/12 curriculum map', () => {
    expect(map.lessonKeys).toHaveLength(42);
    expect(Object.keys(map.slotTargets)).toHaveLength(30);
    expect(Object.keys(map.boundaries)).toHaveLength(12);
    expect(validateOrientation(approvedOrientation)).toEqual([]);
    expect(validateOrientation(draft)).toContain('orientation requires approved editorial status');
  });
  it('accepts a complete review fixture and rejects changed forms, targets and translations', () => {
    const data = release();
    const context = { ...map, orientation: approvedOrientation };
    expect(validateRelease(data, context)).toEqual([]);
    data.forms.posttest.items[0].stem.fil = '';
    expect(validateRelease(data, context)).toEqual(expect.arrayContaining([
      'posttest: full form hash mismatch', 'posttest T01: missing bilingual stem or rationale',
    ]));
    data.forms.posttest.items[0].stem.fil = text.fil;
    data.checkpoints[0].after_lesson_key = map.boundaries.G02;
    expect(validateRelease(data, context)).toContain('G01: invalid boundary');
  });
});
