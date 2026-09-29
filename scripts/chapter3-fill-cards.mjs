import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'content/training/chapter3-core-competencies');
const blueprint = JSON.parse(readFileSync(path.join(dir, 'chapter-blueprint.json'), 'utf8'));
const definitions = new Map(blueprint.modules.flatMap(m => m.lessons.map(l => [l.code, l])));
const cardsPath = path.join(dir, 'lesson-cards.json');
// These two cards were written individually. All other cards are regenerated
// from the localization rows so editing the generator remains repeatable.
const individuallyAuthored = new Set(['3.1.3', '3.10.1']);
const existing = new Map(JSON.parse(readFileSync(cardsPath, 'utf8')).filter(c => individuallyAuthored.has(c.code)).map(c => [c.code, c]));
const lines = readFileSync(path.join(dir, 'lesson-localization.tsv'), 'utf8').trim().split(/\r?\n/u);
const header = lines.shift().split('|');
if (header.join('|') !== 'code|title_fil|case_fil|case_en|action_fil|wrong_fil|wrong_en') throw new Error('Unexpected localization columns');
for (const line of lines) {
  const cells = line.split('|');
  if (cells.length !== header.length) throw new Error(`Bad localization row: ${line}`);
  const row = Object.fromEntries(header.map((h, i) => [h, cells[i]]));
  if (existing.has(row.code)) throw new Error(`An individually authored card also has a localization row: ${row.code}`);
  const lesson = definitions.get(row.code);
  if (!lesson) throw new Error(`Unknown lesson ${row.code}`);
  const actionEn = lesson.objective_en.replace(/^(?:Given|In) [^,]+,\s*/u, '').replace(/^./u, c => c.toUpperCase());
  const exampleFil = `Sa kathang-isip na kasong ito, ginamit ni Mira ang kasalukuyang lokal na gabay bago sumagot. Ito ang ipinakita niya sa observer: ${row.action_fil}`;
  const exampleEn = `In this fictional case, Mira checks the current local guide before responding. The observer sees that she ${lesson.indicator_en.replace(/^./u, c => c.toLowerCase())}`;
  existing.set(row.code, {
    code: row.code, title_fil: row.title_fil, case_fil: row.case_fil, case_en: row.case_en,
    action_fil: row.action_fil, action_en: actionEn,
    example_fil: exampleFil, example_en: exampleEn,
    risk_fil: `Iwasan ang ganitong kilos: ${row.wrong_fil} Kung hindi tiyak ang susunod na hakbang, humingi ng gabay sa midwife o aprubadong lokal na protocol.`,
    risk_en: `Avoid this action: ${row.wrong_en} If the next step is uncertain, consult the midwife or approved local protocol.`,
    next_fil: `Sa susunod na pinangangasiwaang pagsasanay, gamitin ang kathang-isip na kasong ito. Ipasuri ang kilos sa observer sheet at ulitin ang hakbang na kailangang ayusin.`,
    next_en: `At the next supervised practice, use this fictional case. Ask the observer to score the action on the observer sheet, then repeat the step that needs correction.`,
    wrong_fil: row.wrong_fil, wrong_en: row.wrong_en,
    indicator_fil: `Ginamit ang kasalukuyang lokal na gabay at naipakita ang mahalagang hakbang: ${row.action_fil}`,
    indicator_en: lesson.indicator_en,
  });
}
const ordered = blueprint.modules.flatMap(m => m.lessons.map(l => existing.get(l.code)));
if (ordered.length !== 65 || ordered.some(c => !c)) throw new Error('Cards do not cover all 65 lessons');
writeFileSync(cardsPath, JSON.stringify(ordered, null, 2) + '\n');
console.log(`Filled ${ordered.length} bilingual authoring cards`);
