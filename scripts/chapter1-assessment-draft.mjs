import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { paired, practiceSituations, practiceSituationsFil } from '../content/training/day1-basic-competencies/learner-assessment-v2/draft-question-seeds.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const content = join(root, 'content/training/day1-basic-competencies/learner-assessment-v2');
const map = readFileSync(join(root, 'docs/chapter-1-assessment-plan/lesson-assessment-map.csv'), 'utf8');
// Use the existing quoted CSV reader so commas in objectives do not shift columns.
const rows = [];
let cells = [], cell = '', quote = false;
for (let i = 0; i < map.length; i++) {
  const c = map[i];
  if (quote && c === '"' && map[i + 1] === '"') { cell += '"'; i++; }
  else if (c === '"') quote = !quote;
  else if (c === ',' && !quote) { cells.push(cell); cell = ''; }
  else if (c === '\n' && !quote) { cells.push(cell.replace(/\r$/, '')); rows.push(cells); cells = []; cell = ''; }
  else cell += c;
}
const [header, ...values] = rows;
const data = values.map(row => Object.fromEntries(header.map((key, i) => [key, row[i]])));
const primary = Object.fromEntries(data.flatMap(row => {
  const slots = row.mapping_role === 'Primary' ? row.proposed_slots.split(';') :
    [...row.mapping_role.matchAll(/Primary\s+(T\d{2})/g)].map(match => match[1]);
  return slots.map(slot => [slot, row]);
}));
const group = Object.fromEntries(data.filter(row => row.checkpoint_after_lesson === row.lesson_number)
  .map(row => [row.checkpoint_group, row]));
const stableId = key => {
  const hex = createHash('sha256').update(`chapter1-draft-item:${key}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
const distractor = {
  en: 'This choice skips a needed verification, consent, authority or follow-up step. Review the case against the linked lesson.',
  fil: 'Nilalaktawan ng pagpiling ito ang kailangang pagtiyak, pahintulot, awtoridad o follow-up. Ihambing ang sitwasyon sa kaugnay na aralin.',
};
function item(key, target, slot, stem, seed, lesson) {
  const shift = Number.parseInt(createHash('sha256').update(key).digest('hex').slice(0, 2), 16) % 3;
  const options = seed.options.map((label, i) => ({
    id: `o${i + 1}`, label,
    ...(i ? { distractor_rationale: distractor } : {}),
  }));
  const ordered = [...options.slice(shift), ...options.slice(0, shift)];
  return {
    item_id: stableId(key), editorial_key: key, version: 1, target, ...(slot ? { slot } : {}),
    stem, options: ordered, correct_option_id: 'o1', rationale: seed.rationale,
    lesson_keys: [lesson.lesson_key], source: lesson.read_source,
    reviewer: 'pending editorial and bilingual review', review_status: 'draft',
    safety_privacy_review_required: /^(T0[3589]|T1[234579]|T20|T2[5679]|G0[24569]|G11)$/.test(target),
    ...(/^(T0[3589]|T1[234579]|T20|T2[5679]|G0[24569]|G11)$/.test(target)
      ? { safety_privacy_reviewer: 'pending qualified reviewer' } : {}),
  };
}
const forms = Object.fromEntries(['pretest', 'posttest'].map((phase, phaseIndex) => [phase, {
  editorial_status: 'draft', items: paired.map((seed, i) => {
    const slot = `T${String(i + 1).padStart(2, '0')}`;
    return item(`${phase}-${slot}`, slot, slot, seed.stems[phaseIndex], seed, primary[slot]);
  }),
}]));
// A practice situation uses the most relevant paired seed as a first draft of
// answer choices. Reviewers must tailor every alternative to its own case.
const practiceSlots = [
  [1, 2, 1, 3], [4, 4, 20, 21], [5, 6, 7, 7], [8, 9, 9, 8],
  [10, 10, 10, 10], [11, 12, 13, 11], [14, 14, 14, 14], [15, 16, 14, 15],
  [17, 19, 20, 4], [22, 23, 24, 22], [25, 26, 27, 27], [28, 28, 29, 30],
];
const checkpoints = Array.from({ length: 12 }, (_, index) => {
  const key = `G${String(index + 1).padStart(2, '0')}`;
  const items = practiceSituations[index].map((situation, j) => {
    const seed = paired[practiceSlots[index][j] - 1];
    const stem = {
      en: `${situation} What is the best next step for the BHW?`,
      fil: `${practiceSituationsFil[index][j]} Ano ang pinakamainam na susunod na hakbang ng BHW?`,
    };
    const candidate = primary[`T${String(practiceSlots[index][j]).padStart(2, '0')}`];
    const row = candidate.checkpoint_group === key ? candidate : group[key];
    return item(`${key}-${j + 1}`, key, null, stem, seed, row);
  });
  return { key, after_lesson_key: group[key].lesson_key, first: items.slice(0, 2), alternates: items.slice(2) };
});
if (paired.length !== 30 || checkpoints.length !== 12 || checkpoints.some(checkpoint => checkpoint.first.length !== 2 || checkpoint.alternates.length !== 2))
  throw new Error('Draft item counts do not match the blueprint');
const bank = { editorial_status: 'draft', blueprint_source: 'docs/chapter-1-assessment-plan/README.md',
  warning: 'Unreviewed authoring draft. Do not import, publish, or treat these keys and alternatives as approved guidance.',
  forms, checkpoints };
const output = join(content, 'draft-items.json');
writeFileSync(output, `${JSON.stringify(bank, null, 2)}\n`);
process.stdout.write(`Wrote ${output}: 60 paired form items and 48 checkpoint items (draft only).\n`);
