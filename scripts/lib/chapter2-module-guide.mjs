// Chapter 2 subchapter-level facilitator guide: the course_module_facilitator_notes
// row (whole-subchapter script, competency statement, indicators, activity cards)
// that Chapter 1 loads through `training:load --mode content`. Chapter 2's
// subchapters are converted (lessons mode), so that path refuses them; this
// module assembles the same payload from the draft package instead.
//
// Indicators are not authored twice: a Chapter 2 subchapter has exactly one
// objective per lesson (module objective i = the lesson at position i), so the
// subchapter indicators are the lessons' own competency.json indicators with
// objective_index remapped to the lesson position.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { validateActivities } from './training-activities.mjs';

export const chapter2Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../content/training/chapter2-common-competencies');
export const releaseManifestPath = path.join(chapter2Root, 'release/los-banos-2026-09-25.json');
export const CHAPTER2_MODULES = ['01-difficult-situations', '02-quality-service', '03-infection-control', '04-first-aid', '05-medicinal-plants', '06-community-mobilization', '07-disaster-preparedness'];

const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const h2 = (markdown) => markdown.split('\n').filter((line) => line.startsWith('## '));

export function loadChapter2ModuleGuide(moduleKey, root = chapter2Root, { requireIndicators = true } = {}) {
  const dir = path.join(root, 'drafts', moduleKey);
  const fail = (message) => { throw new Error(`${moduleKey}: ${message}`); };
  const moduleJson = json(path.join(dir, 'module.json'));
  const lessonKeys = readdirSync(path.join(dir, 'lessons'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const lessons = lessonKeys.map((key) => {
    const manifest = json(path.join(dir, 'lessons', key, 'lesson.json')).manifest;
    const [indicator, ...extra] = json(path.join(dir, 'lessons', key, 'competency.json')).observation_indicators ?? [];
    if (!indicator || extra.length) fail(`${key} must have exactly one lesson indicator`);
    return { key, position: manifest.position, objective_en: manifest.objectives_en?.[0], indicator };
  }).sort((a, b) => a.position - b.position);

  lessons.forEach((l, i) => {
    if (l.position !== i) fail(`lesson positions must be 0..${lessons.length - 1}`);
    if (moduleJson.objectives_en[i] !== l.objective_en) fail(`objective ${i} does not match lesson ${l.key}`);
  });
  if (moduleJson.objectives_en.length !== lessons.length) fail('one subchapter objective per lesson');

  const observation_indicators = lessons.map((l) => ({ ...l.indicator, objective_index: l.position }));
  const competencyPath = path.join(dir, 'competency.json');
  if (!existsSync(competencyPath)) fail('missing competency.json');
  const competency = json(competencyPath);
  for (const lang of ['fil', 'en']) if (!competency[`competency_statement_${lang}`]?.trim()) fail(`empty competency_statement_${lang}`);
  if (requireIndicators && !competency.observation_indicators) fail('competency.json has no indicators; run chapter2-guide-load --materialize');
  if (competency.observation_indicators && !isDeepStrictEqual(competency.observation_indicators, observation_indicators)) {
    fail('competency.json indicators drifted from the lesson indicators; run chapter2-guide-load --materialize');
  }

  const notes = {};
  for (const lang of ['fil', 'en']) {
    const file = path.join(dir, `facilitator-notes.${lang}.md`);
    if (!existsSync(file)) fail(`missing facilitator-notes.${lang}.md`);
    notes[lang] = readFileSync(file, 'utf8');
    if (!notes[lang].trim()) fail(`empty facilitator-notes.${lang}.md`);
  }
  if (h2(notes.fil).length !== h2(notes.en).length || h2(notes.en).length < 6) fail('facilitator notes must have the same sections in both languages');

  const activitiesPath = path.join(dir, 'facilitator-activities.json');
  if (!existsSync(activitiesPath)) fail('missing facilitator-activities.json');
  const activities = validateActivities(json(activitiesPath), observation_indicators, lessonKeys);
  const covered = new Set(activities.filter((a) => a.kind !== 'game').flatMap((a) => a.objective_indices));
  const uncovered = lessons.filter((l) => !covered.has(l.position)).map((l) => l.key);
  if (uncovered.length) fail(`no observable activity for ${uncovered.join(', ')}`);

  // The session plan's minutes are the reconciled allocation; the cards must not
  // silently expand or shrink it.
  const planned = json(path.join(dir, 'activities.json')).activities.reduce((n, a) => n + a.minutes, 0);
  // Cards in one choice_group are alternatives for the same slot: count it once.
  const groups = new Map();
  for (const a of activities) {
    const slot = a.choice_group ?? a.id;
    groups.set(slot, Math.max(groups.get(slot) ?? 0, a.minutes));
  }
  const carded = [...groups.values()].reduce((n, m) => n + m, 0);
  if (carded !== planned) fail(`activity cards total ${carded} minutes; the session plan is ${planned}`);

  return {
    module_key: moduleKey,
    notes_fil: notes.fil,
    notes_en: notes.en,
    competency_statement_fil: competency.competency_statement_fil,
    competency_statement_en: competency.competency_statement_en,
    observation_indicators,
    activities,
  };
}

// Writes the lesson-derived indicators into the subchapter competency.json so
// the file reviewers read is the file that loads. Keeps the authored statement.
export function materializeCompetency(moduleKey, root = chapter2Root) {
  const dir = path.join(root, 'drafts', moduleKey);
  const file = path.join(dir, 'competency.json');
  const current = json(file);
  const { observation_indicators } = loadChapter2ModuleGuide(moduleKey, root, { requireIndicators: false });
  const next = {
    competency_statement_fil: current.competency_statement_fil,
    competency_statement_en: current.competency_statement_en,
    observation_indicators,
  };
  return { file, content: `${JSON.stringify(next, null, 2)}\n`, changed: !isDeepStrictEqual(current, next) };
}
