// @vitest-environment node
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CHAPTER2_MODULES, chapter2Root, loadChapter2ModuleGuide, materializeCompetency } from '../lib/chapter2-module-guide.mjs';
import { planGuideRow } from '../chapter2-guide-load.mjs';

const copy = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ch2-guide-'));
  cpSync(path.join(chapter2Root, 'drafts'), path.join(root, 'drafts'), { recursive: true });
  return root;
};
const edit = (file, fn) => writeFileSync(file, JSON.stringify(fn(JSON.parse(readFileSync(file, 'utf8'))), null, 2));

test('every Chapter 2 subchapter has a complete, reconciled facilitator guide', () => {
  for (const key of CHAPTER2_MODULES) {
    const g = loadChapter2ModuleGuide(key);
    const objectives = JSON.parse(readFileSync(path.join(chapter2Root, 'drafts', key, 'module.json'), 'utf8')).objectives_en;
    assert.equal(g.observation_indicators.length, objectives.length, key);
    assert.deepEqual(g.observation_indicators.map((i) => i.objective_index), objectives.map((_, i) => i), key);
    assert.ok(g.competency_statement_en.trim() && g.competency_statement_fil.trim(), key);
    assert.ok(g.activities.length > 0, key);
    assert.match(g.notes_en, /^# /, key);
    assert.match(g.notes_fil, /^# /, key);
    assert.equal(materializeCompetency(key).changed, false, `${key}: competency.json is stale`);
  }
});

test('reject subchapter indicators that drift from the lesson indicator', () => {
  const root = copy();
  edit(path.join(root, 'drafts/01-difficult-situations/lessons/listen-and-clarify/competency.json'), (c) => {
    c.observation_indicators[0].observable_en = 'Something else';
    return c;
  });
  assert.throws(() => loadChapter2ModuleGuide('01-difficult-situations', root), /drifted/);
});

test('reject activity cards that change the session allocation', () => {
  const root = copy();
  edit(path.join(root, 'drafts/06-community-mobilization/facilitator-activities.json'), (cards) => {
    cards[0].minutes += 30;
    return cards;
  });
  assert.throws(() => loadChapter2ModuleGuide('06-community-mobilization', root), /session plan is 60/);
});

test('reject a lesson with no observable activity', () => {
  const root = copy();
  edit(path.join(root, 'drafts/02-quality-service/facilitator-activities.json'), (cards) => cards.map((c) => ({ ...c, objective_indices: c.objective_indices.filter((i) => i !== 0) })));
  assert.throws(() => loadChapter2ModuleGuide('02-quality-service', root), /no observable activity/);
});

test('reject missing notes in one language', () => {
  const root = copy();
  writeFileSync(path.join(root, 'drafts/07-disaster-preparedness/facilitator-notes.fil.md'), '');
  assert.throws(() => loadChapter2ModuleGuide('07-disaster-preparedness', root), /empty facilitator-notes.fil.md/);
});

test('plan: create, unchanged, and version guard for changed cards', () => {
  const guide = loadChapter2ModuleGuide('01-difficult-situations');
  assert.equal(planGuideRow(undefined, guide).action, 'create');
  const row = { id: 'n1', ...planGuideRow(undefined, guide).payload };
  assert.equal(planGuideRow(row, guide).action, 'unchanged');
  const changed = structuredClone(guide);
  changed.activities[0].minutes += 1;
  assert.throws(() => planGuideRow(row, changed), /increase activity version/);
  changed.activities[0].version += 1;
  assert.equal(planGuideRow(row, changed).action, 'update');
});
