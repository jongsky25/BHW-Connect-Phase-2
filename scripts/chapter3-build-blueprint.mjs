import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(root, 'docs/chapter-3-objective-practice-crosswalk.md'), 'utf8');
const output = path.join(root, 'content/training/chapter3-core-competencies/chapter-blueprint.json');
// The guide assigns one eight-hour block to 3.1–3.2. The three/five split is
// an authoring allocation, not a separate source claim.
const hours = { 1: 3, 2: 5, 3: 40, 4: 32, 5: 20, 6: 12, 7: 12, 8: 16, 9: 12, 10: 72, 11: 96, 12: 72 };
const titlesFil = {
  1: 'Mga serbisyo sa primary care at pag-uugnay sa serbisyo',
  2: 'BHW bilang tagapagsulong ng kalusugan sa barangay',
  3: 'Kumilos nang higit, kumain nang wasto',
  4: 'Maging malinis, mamuhay nang sustenable',
  5: 'Magpabakuna',
  6: 'Iwasan ang tabako, alak at droga',
  7: 'Alagaan ang sarili at kapwa',
  8: 'Isagawa ang ligtas na pakikipagtalik',
  9: 'Huwag manakit, unahin ang kaligtasan',
  10: 'Subaybayan ang kalagayang pangkalusugan',
  11: 'Profiling ng sambahayan at mga target list',
  12: 'Kagamitan, suplay at talaan ng BHS',
};
const modules = [];
let current = null;
for (const line of source.split(/\r?\n/u)) {
  const heading = /^## 3\.(\d+) (.+?)(?: — .+)?$/u.exec(line);
  if (heading) {
    const index = Number(heading[1]);
    current = { code: `3.${index}`, module_key: `${String(index).padStart(2, '0')}-${heading[2].toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '').slice(0, 48)}`, title_fil: titlesFil[index], title_en: heading[2], source_allocation_hours: hours[index], lessons: [] };
    modules.push(current);
    continue;
  }
  const cells = line.startsWith('| 3.') ? line.split('|').slice(1, -1).map(s => s.trim()) : [];
  if (cells.length !== 5 || !current) continue;
  const match = /^(3\.\d+\.\d+) (.+)$/u.exec(cells[0]);
  if (!match) continue;
  const sourcePages = {};
  for (const match of cells[1].matchAll(/([RF])(\d+(?:–\d+)?)/gu)) {
    const kind = match[1], chunk = match[2];
    const [a, b] = chunk.split('–').map(Number);
    sourcePages[kind] ??= [];
    for (let n = a; n <= (b ?? a); n++) sourcePages[kind].push(n);
  }
  const key = match[2].toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
  current.lessons.push({ code: match[1], lesson_key: key, title_en: match[2], objective_en: cells[2], practice_en: cells[3], indicator_en: cells[4], source_pages: sourcePages, status: 'outline' });
}
if (modules.length !== 12 || modules.flatMap(m => m.lessons).length !== 65) throw new Error('Crosswalk does not contain twelve units and 65 lessons');
const keys = modules.flatMap(m => m.lessons.map(l => l.lesson_key));
if (new Set(keys).size !== keys.length) throw new Error('Duplicate lesson keys');
const blueprint = {
  chapter_key: 'chapter-3', title_fil: 'Ang BHW bilang Tagapagsulong ng Primary Care', title_en: 'The BHW as a Primary Care Advocate',
  status: 'offline-authoring', availability: 'unavailable', publication_allowed: false,
  planned_lesson_count: 65, authored_lesson_count: 0,
  source_training_hours: 392,
  source_hour_note: 'Owner planning decision 2026-09-29 uses F101 monitoring detail (72 hours); F45 overview prints 64 and a 384-hour total.',
  shared_allocations: [{ subchapters: ['3.1', '3.2'], source_hours: 8, planning_split_hours: [3, 5] }],
  modules,
};
writeFileSync(output, JSON.stringify(blueprint, null, 2) + '\n');
console.log(`Wrote ${modules.length} modules and ${keys.length} lesson boundaries`);
