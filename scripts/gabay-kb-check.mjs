#!/usr/bin/env node
// Offline validation only; no credentials, database or network access.
import { loadContent, renderAnswer } from './lib/kb-content.mjs';

const content = loadContent('philhealth-gabay');
if (content.entries.length !== 19) throw new Error('expected 19 Gabay KB entries');
for (const entry of content.entries) {
  if (!Array.isArray(entry.claims) || entry.claims.length === 0) throw new Error(`${entry.id}: missing claim IDs`);
  for (const claim of entry.claims) {
    if (claim.startsWith('PH-') && !content.sources[claim]) throw new Error(`${entry.id}: unknown claim ${claim}`);
    if (!claim.startsWith('PH-') && claim !== 'BHW-02') throw new Error(`${entry.id}: unknown scope claim ${claim}`);
  }
  for (const language of ['en', 'fil']) {
    const answer = renderAnswer(entry, content.sources, language);
    if (!answer.includes(language === 'en' ? 'Source:\n' : 'Sanggunian:\n')) throw new Error(`${entry.id}: missing rendered citation`);
  }
}
for (const [id, source] of Object.entries(content.sources)) {
  if (!source.url.startsWith('https://www.philhealth.gov.ph/')) throw new Error(`${id}: non-PhilHealth URL`);
}
console.log(JSON.stringify({ corpus: content.corpus, entries: content.entries.length,
  categories: content.categories.length, sources: Object.keys(content.sources).length,
  synonyms: content.synonyms.length, clarifiers: content.clarifiers.length,
  mode: 'offline validation only' }, null, 2));
