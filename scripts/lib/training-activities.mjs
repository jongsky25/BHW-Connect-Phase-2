import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

export function validateActivities(cards, indicators, lessonKeys = []) {
  const assert = (ok, message) => { if (!ok) throw new Error(`Invalid activity: ${message}`); };
  assert(Array.isArray(cards), 'expected array');
  const ids = new Set();
  const text = (v) => v && ['en','fil'].every(l => typeof v[l] === 'string' && v[l].trim());
  for (const c of cards) {
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id) && !ids.has(c.id), 'unique stable id'); ids.add(c.id);
    assert(Number.isInteger(c.version) && c.version > 0 && c.optional === true, `${c.id}: version/optional`);
    assert(['discussion','game','role-play','demonstration','practical'].includes(c.kind), `${c.id}: kind`);
    assert(Number.isInteger(c.minutes) && c.minutes > 0 && c.minutes <= 180, `${c.id}: minutes`);
    assert(c.choice_group === null || /^[a-z0-9-]+$/.test(c.choice_group), `${c.id}: choice group`);
    assert(Array.isArray(c.lesson_keys) && c.lesson_keys.every(k => lessonKeys.includes(k)), `${c.id}: unknown lesson`);
    assert(Array.isArray(c.objective_indices) && c.objective_indices.every(i => indicators.some(x => x.objective_index === i)), `${c.id}: unknown indicator`);
    assert(Array.isArray(c.source_pages) && c.source_pages.length && c.source_pages.every(p => Number.isInteger(p) && p >= 1 && p <= 78), `${c.id}: PDF pages`);
    for (const k of ['title','purpose','group_size','output','alternative']) assert(text(c[k]), `${c.id}: bilingual ${k}`);
    for (const k of ['materials','steps','debrief','observe','worksheet']) assert(Array.isArray(c[k]) && c[k].length && c[k].every(text), `${c.id}: bilingual ${k}`);
    assert(c.kind !== 'game' || !c.objective_indices.length, `${c.id}: games are not competency evidence alone`);
  }
  return cards;
}

export function loadActivities(moduleDir, indicators) {
  const file = path.join(moduleDir, 'activities.json');
  if (!existsSync(file)) return [];
  const lessons = path.join(moduleDir, 'lessons');
  const keys = existsSync(lessons) ? readdirSync(lessons, {withFileTypes:true}).filter(x => x.isDirectory()).map(x => x.name) : [];
  return validateActivities(JSON.parse(readFileSync(file,'utf8')), indicators, keys);
}

// Preflight the whole selection before any write. Only activities are patched;
// course content, notes, assessments, progress and certificates are untouched.
export async function syncActivities(client, modules, lock, apply) {
  const plan = [];
  for (const mod of modules) {
    const id = lock.modules[mod.id];
    if (!id) throw new Error(`Missing locked module: ${mod.id}`);
    const [row] = await client.get(`course_modules?select=id,course_id&id=eq.${id}`);
    if (row?.course_id !== lock.course) throw new Error('Reconcile module identity');
    const [notes] = await client.get(`course_module_facilitator_notes?select=id,activities,observation_indicators&module_id=eq.${id}`);
    if (!notes) throw new Error(`Load facilitator notes first: ${mod.id}`);
    for (const c of mod.facilitatorNotes.activities) {
      if (!c.objective_indices.every(i => notes.observation_indicators.some(x => x.objective_index === i))) throw new Error(`Loaded indicator mismatch: ${c.id}`);
      const old = (notes.activities ?? []).find(a => a.id === c.id);
      if (old && !isDeepStrictEqual(old,c) && c.version <= old.version) throw new Error(`Increase activity version before changing: ${c.id}`);
    }
    const activities = mod.facilitatorNotes.activities;
    plan.push({module:mod.id, id:notes.id, activities, changed:!isDeepStrictEqual(notes.activities ?? [],activities)});
  }
  if (apply) for (const p of plan) if (p.changed) await client.patch(`course_module_facilitator_notes?id=eq.${p.id}`, {activities:p.activities});
  return plan.map(p => ({module:p.module, count:p.activities.length, action:p.changed?'update':'unchanged'}));
}
