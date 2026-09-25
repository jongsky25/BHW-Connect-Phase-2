// Offline checks for the 1.6–1.9 authoring drafts. No client or database access.
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadReferenceModule, canonical, contentHash} from './lib/reference-content.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base=path.join(root,'content/training/day1-basic-competencies');
const inventory=JSON.parse(readFileSync(path.join(base,'drafts/inventory.json'),'utf8'));
const expected={'06-komunikasyon':[5,480],'07-problema':[4,180],'08-osh':[4,240],'09-sustainable-practices':[3,180]};
const json=(p)=>JSON.parse(readFileSync(p,'utf8'));
const totals={lessons:0,readSections:0,slides:0,checks:0,concepts:0,answerPositions:[0,0,0],writes:0};
const keys=new Set(),objectives=new Set(),observables=new Set();
for(const [key,[count,minutes]] of Object.entries(expected)){
 const draft=path.join(base,'drafts',key),legacy=path.join(base,'modules',key);
 for(const file of ['module.json','coverage.json'])assert.equal(canonical(json(path.join(draft,file))),canonical(json(path.join(legacy,file))),key+': baseline metadata drift; reconcile explicitly');
 const loaded=loadReferenceModule(draft,path.join(root,'public'));
 assert.equal(loaded.lessons.length,count);
 const rows=inventory.lessons.filter(l=>l.module===key);
 assert.equal(rows.length,count);assert.equal(rows.reduce((n,l)=>n+l.minutes,0),minutes);
 const concepts=new Set();
 for(const l of loaded.lessons){
  const m=l.manifest,r=l.revision;
  assert(!keys.has(m.lesson_key),'duplicate lesson key');keys.add(m.lesson_key);
  assert(!existsSync(path.join(legacy,'lessons',m.lesson_key)),'draft key already released: reconcile before editing');
  assert(r.slides.length>=4&&r.slides.length<=7,'draft slide target: 4–7');
  assert(!objectives.has(m.objectives_en[0]),'duplicate objective');objectives.add(m.objectives_en[0]);
  assert(!observables.has(l.notes.observation_indicators[0].observable_en),'duplicate observable');observables.add(l.notes.observation_indicators[0].observable_en);
  const row=rows.find(row=>row.key===m.lesson_key);assert(row);assert.equal(row.position,m.position);
  assert.equal(row.read,r.read_sections.length);assert.equal(row.slides,r.slides.length);
  assert.equal(canonical([...row.concepts].sort()),canonical(r.coverage.map(c=>c.id).sort()));
  for(const s of r.read_sections){assert(!s.body_fil.includes(':::')&&!s.body_en.includes(':::'),'legacy directive leaked');if(s.check){assert.equal(s.check.options.length,3);totals.checks++;totals.answerPositions[s.check.correct_option_index]++;}}
  r.coverage.forEach(c=>concepts.add(c.id));totals.lessons++;totals.readSections+=r.read_sections.length;totals.slides+=r.slides.length;
 }
 totals.concepts+=concepts.size;
 console.log(JSON.stringify({module:key,lessons:count,concepts:concepts.size,facilitatedMinutes:minutes,hash:contentHash(loaded)}));
}
assert.equal(totals.lessons,16);assert.equal(inventory.lessons.length,16);
console.log(JSON.stringify({status:'PASS',...totals}));
