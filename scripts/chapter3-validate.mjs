#!/usr/bin/env node
// Offline only: no Supabase client, credentials, or network calls.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadReferenceModule } from './lib/reference-content.mjs';
import { validateActivities } from './lib/training-activities.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = path.join(root, 'content/training/chapter3-core-competencies');
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const blueprint = json(path.join(packageRoot, 'chapter-blueprint.json'));
const cards = json(path.join(packageRoot, 'lesson-cards.json'));
const publicRoot = path.join(root, 'public');
const program = json(path.join(root, 'content/training/day1-basic-competencies/program.json'));
const chapter = program.chapters.find(c => c.chapter_key === 'chapter-3');
assert.equal(chapter?.availability, 'unavailable');
assert.equal(chapter?.delivery_course, null);
assert.equal(blueprint.publication_allowed, false);
assert.equal(blueprint.availability, 'unavailable');
assert.equal(blueprint.modules.length, 12);
assert.equal(blueprint.modules.reduce((n, m) => n + m.source_allocation_hours, 0), 392);
assert.deepEqual(blueprint.modules.slice(0, 2).map(m => m.source_allocation_hours), [3, 5]);
assert.equal(cards.length, 65);
assert.equal(new Set(cards.map(c => c.code)).size, 65);

const report = { mode: 'offline', chapter: 'chapter-3', modules: [], lesson_count: 0, training_minutes: 0, publication_allowed: false };
for (const module of blueprint.modules) {
  const dir = path.join(packageRoot, 'drafts', module.module_key);
  const loaded = loadReferenceModule(dir, publicRoot);
  const meta = json(path.join(dir, 'module.json'));
  const review = json(path.join(dir, 'review.json'));
  const activities = json(path.join(dir, 'activities.json')).activities;
  const competency = json(path.join(dir, 'competency.json'));
  const activityCards = validateActivities(json(path.join(dir, 'facilitator-activities.json')), competency.observation_indicators, module.lessons.map(l => l.lesson_key), 107);
  assert.equal(loaded.lessons.length, module.lessons.length, module.code);
  assert.equal(meta.title_fil, module.title_fil, module.code);
  assert.equal(meta.objectives_en.length, loaded.lessons.length, module.code);
  assert.equal(review.publication_allowed, false, module.code);
  assert.equal(review.lessons.length, loaded.lessons.length, module.code);
  assert.ok(review.lessons.every(l => l.publication_allowed === false && l.independent_review === null), module.code);
  assert.equal(activities.length, loaded.lessons.length, module.code);
  const minutes = activities.reduce((n, a) => n + a.minutes, 0);
  assert.equal(minutes, module.source_allocation_hours * 60, module.code);
  assert.equal(activityCards.reduce((n, a) => n + a.minutes, 0), minutes, module.code);
  assert.equal(competency.observation_indicators.length, module.lessons.length, module.code);
  for (const [i, lesson] of loaded.lessons.entries()) {
    const b = module.lessons[i];
    assert.equal(lesson.manifest.lesson_key, b.lesson_key, b.code);
    assert.equal(lesson.manifest.position, i, b.code);
    assert.equal(meta.objectives_en[i], lesson.manifest.objectives_en[0], b.code);
    assert.equal(activities[i].lesson_key, b.lesson_key, b.code);
    assert.equal(activities[i].objective_index, i, b.code);
    assert.ok(b.source_pages.R?.length && b.source_pages.F?.length, b.code);
    assert.ok(cards.find(c => c.code === b.code)?.case_fil, b.code);
  }
  report.modules.push({ code: module.code, key: module.module_key, lessons: loaded.lessons.length, minutes });
  report.lesson_count += loaded.lessons.length;
  report.training_minutes += minutes;
}
assert.equal(report.lesson_count, 65);
assert.equal(report.training_minutes, 392 * 60);
console.log(JSON.stringify(report, null, 2));
