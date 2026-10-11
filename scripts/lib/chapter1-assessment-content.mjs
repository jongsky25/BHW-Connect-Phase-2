import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SLOTS = Array.from({ length: 30 }, (_, i) => `T${String(i + 1).padStart(2, '0')}`);
const GROUPS = Array.from({ length: 12 }, (_, i) => `G${String(i + 1).padStart(2, '0')}`);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const filled = value => typeof value === 'string' && value.trim().length > 0;
const bilingual = value => value && filled(value.en) && filled(value.fil);

export function fullFormHash(items) {
  return createHash('sha256').update(JSON.stringify(items)).digest('hex');
}

export function validateOrientation(orientation) {
  const errors = [];
  if (orientation?.editorial_status !== 'approved') errors.push('orientation requires approved editorial status');
  for (const key of ['expectations', 'overview', 'recap']) {
    if (!bilingual(orientation?.[key])) errors.push(`${key} requires English and Filipino`);
  }
  const intros = orientation?.introductions;
  if (!Array.isArray(intros) || intros.length !== 9) errors.push('exactly nine major introductions are required');
  else for (let n = 1; n <= 9; n++) {
    const intro = intros[n - 1];
    if (intro?.id !== `chapter1-major-${n}-introduction` || intro.major_lesson !== n ||
        !filled(intro.title_en) || !filled(intro.body_en) || !filled(intro.body_fil)) {
      errors.push(`major introduction ${n} is missing, out of order or untranslated`);
    }
  }
  return errors;
}

export function validateRelease(release, { lessonKeys, lessonHashes, boundaries, slotTargets, orientation } = {}) {
  const errors = validateOrientation(orientation);
  const knownLessons = new Set(lessonKeys ?? []);
  const seenIds = new Set();
  const seenEditorial = new Set();
  const allItems = [];
  const item = (q, context, expectedTarget) => {
    if (!q || typeof q !== 'object') { errors.push(`${context}: missing item`); return; }
    const allowed = new Set(['item_id', 'editorial_key', 'version', 'target', 'slot',
      'stem', 'rationale', 'options', 'correct_option_id', 'lesson_keys', 'source',
      'reviewer', 'review_status', 'safety_privacy_review_required',
      'safety_privacy_reviewer', 'related_practice_id']);
    if (Object.keys(q).some(key => !allowed.has(key))) errors.push(`${context}: unexpected item field`);
    allItems.push(q);
    if (!UUID.test(q.item_id ?? '') || seenIds.has(q.item_id)) errors.push(`${context}: invalid or repeated item_id`);
    seenIds.add(q.item_id);
    if (!filled(q.editorial_key) || seenEditorial.has(q.editorial_key)) errors.push(`${context}: missing or repeated editorial_key`);
    seenEditorial.add(q.editorial_key);
    if (!Number.isInteger(q.version) || q.version < 1) errors.push(`${context}: invalid version`);
    if (q.target !== expectedTarget) errors.push(`${context}: wrong target`);
    if (!bilingual(q.stem) || !bilingual(q.rationale)) errors.push(`${context}: missing bilingual stem or rationale`);
    if (!Array.isArray(q.options) || q.options.length !== 3 ||
        new Set(q.options.map(o => o?.id)).size !== 3 ||
        q.options.some(o => !filled(o?.id) || !bilingual(o?.label) ||
          (o.id !== q.correct_option_id && !bilingual(o?.distractor_rationale)))) {
      errors.push(`${context}: exactly three stable bilingual options and rationales required`);
    }
    if (!q.options?.some(o => o.id === q.correct_option_id)) errors.push(`${context}: invalid correct option ID`);
    if (!Array.isArray(q.lesson_keys) || !q.lesson_keys.length ||
        q.lesson_keys.some(key => !knownLessons.has(key))) errors.push(`${context}: invalid lesson link`);
    if (context.startsWith('pretest ') || context.startsWith('posttest ')) {
      if (!q.lesson_keys?.includes(slotTargets?.[expectedTarget])) errors.push(`${context}: missing primary lesson target`);
    }
    if (!filled(q.source) || !filled(q.reviewer) || q.review_status !== 'approved') errors.push(`${context}: missing approval metadata`);
    if (q.safety_privacy_review_required && !filled(q.safety_privacy_reviewer)) errors.push(`${context}: missing safety/privacy review`);
  };

  if (!filled(release?.release_id) || !filled(release?.blueprint_id) || !filled(release?.source_commit) ||
      release?.program_key !== 'bhw-reference-manual' || release?.chapter_key !== 'chapter-1' ||
      release?.publication_status !== 'approved' || release?.comparability_status !== 'unvalidated') {
    errors.push('release scope, identity, approval or comparability status is invalid');
  }
  if (!Array.isArray(release?.curriculum_revisions) || release.curriculum_revisions.length !== knownLessons.size ||
      new Set(release.curriculum_revisions.map(r => r.lesson_key)).size !== knownLessons.size) {
    errors.push('every mapped lesson needs exactly one pinned curriculum revision');
  } else for (const row of release.curriculum_revisions) {
    if (!knownLessons.has(row.lesson_key) || !UUID.test(row.revision_id ?? '') ||
        !SHA256.test(row.sha256 ?? '') ||
        (lessonHashes?.[row.lesson_key] && lessonHashes[row.lesson_key] !== row.sha256)) {
      errors.push(`invalid or stale revision for ${row.lesson_key}`);
    }
  }
  const formIds = new Set();
  for (const phase of ['pretest', 'posttest']) {
    const form = release?.forms?.[phase];
    if (!filled(form?.form_id) || formIds.has(form?.form_id)) errors.push(`${phase}: missing or duplicate form ID`);
    formIds.add(form?.form_id);
    if (!Array.isArray(form?.items) || form.items.length !== 30) errors.push(`${phase}: exactly 30 items required`);
    const slots = form?.items?.map(q => q.slot) ?? [];
    if (JSON.stringify(slots) !== JSON.stringify(SLOTS)) errors.push(`${phase}: T01–T30 must appear once in blueprint order`);
    if (!SHA256.test(form?.hash ?? '') || form.hash !== fullFormHash(form?.items ?? [])) errors.push(`${phase}: full form hash mismatch`);
    form?.items?.forEach((q, i) => item(q, `${phase} ${SLOTS[i] ?? i}`, SLOTS[i]));
  }
  if (!Array.isArray(release?.checkpoints) || release.checkpoints.length !== 12) errors.push('exactly 12 checkpoints required');
  release?.checkpoints?.forEach((group, i) => {
    const key = GROUPS[i];
    if (group.key !== key || group.after_lesson_key !== boundaries?.[key]) errors.push(`${key}: invalid boundary`);
    if (!Array.isArray(group.first) || group.first.length !== 2 || !Array.isArray(group.alternates) || group.alternates.length !== 2) {
      errors.push(`${key}: exactly two first and two alternate items required`);
    }
    group.first?.forEach((q, j) => item(q, `${key} first ${j + 1}`, key));
    group.alternates?.forEach((q, j) => item(q, `${key} alternate ${j + 1}`, key));
  });
  if (allItems.length !== 108) errors.push('release needs 108 unique reviewed items');
  return errors;
}

export function loadLessonMap(root) {
  const csv = readFileSync(join(root, 'docs/chapter-1-assessment-plan/lesson-assessment-map.csv'), 'utf8');
  // The lesson key and boundary are columns 2 and 15. Parse quoted CSV so
  // commas inside objectives do not change their positions.
  const rows = [];
  let fields = [], field = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted && c === '"' && csv[i + 1] === '"') { field += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { fields.push(field); field = ''; }
    else if (c === '\n' && !quoted) { fields.push(field.replace(/\r$/, '')); rows.push(fields); fields = []; field = ''; }
    else field += c;
  }
  if (field || fields.length) { fields.push(field); rows.push(fields); }
  const [header, ...data] = rows;
  const at = name => header.indexOf(name);
  return { lessonKeys: data.map(row => row[at('lesson_key')]),
    slotTargets: Object.fromEntries(data.flatMap(row => {
      const role = row[at('mapping_role')];
      const slots = role === 'Primary' ? row[at('proposed_slots')].split(';') :
        [...role.matchAll(/Primary\s+(T\d{2})/g)].map(match => match[1]);
      return slots.map(slot => [slot, row[at('lesson_key')]]);
    })),
    boundaries: Object.fromEntries(data.filter(row => row[at('checkpoint_after_lesson')] === row[at('lesson_number')])
      .map(row => [row[at('checkpoint_group')], row[at('lesson_key')]])) };
}
