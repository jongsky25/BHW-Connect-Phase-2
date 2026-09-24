import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {course,lessons} from './content.mjs';
const legacy=JSON.parse(await readFile(new URL('../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/coverage.json',import.meta.url),'utf8'));
test('six independent stable lessons retain every required legacy concept in both authored modes',()=>{
  assert.equal(lessons.length,6);assert.equal(course.proposedLessonCount,42);assert.equal(course.chapters.length,3);assert.equal(course.subchapters.length,9);
  const covered=new Set(lessons.flatMap(l=>l.sections.flatMap(s=>s.concepts)));
  const required=legacy.concepts.filter(c=>!c.redundant_with).map(c=>c.id);
  assert.equal(required.length,20);assert.deepEqual([...covered].sort(),required.sort());
  const ids=lessons.flatMap(l=>[l.id,...l.sections.flatMap(s=>[s.id,s.slide.id])]);assert.equal(new Set(ids).size,ids.length);
});
test('bilingual Read and Slides are separately authored, source-located and readable',()=>{
  for(const l of lessons){
    assert.ok(l.sources.includes('PDF'));assert.ok(l.sections.length+1>=4&&l.sections.length+1<=7);
    for(const lang of ['fil','en']){
      assert.ok(l.title[lang]);assert.ok(l.objective[lang]);assert.ok(l.takeaway[lang]);
      for(const s of l.sections){
        assert.ok(s.read[lang].split(/\s+/).length>=30);
        const copy=[s.title[lang],...s.slide.labels.map(x=>x[lang]),s.slide.caption[lang]].join(' ');
        assert.ok(copy.split(/\s+/).length<=45,`${l.number}/${s.id}/${lang}: ${copy.split(/\s+/).length} words exceeds review ceiling`);
        assert.notEqual(copy,s.read[lang]);assert.ok(s.slide.asset.match(/^A0[1-7]$/));
      }
    }
  }
});
test('each lesson has feedback and a valid self-check, with all seven visual briefs represented',()=>{
  const assets=new Set();
  for(const l of lessons){
    assert.equal(l.check.options.length,3);assert.ok(l.check.correct>=0&&l.check.correct<3);
    for(const lang of ['fil','en']){assert.ok(l.check.prompt[lang]);assert.ok(l.check.feedback[lang]);for(const o of l.check.options)assert.ok(o[lang]);}
    for(const s of l.sections)assets.add(s.slide.asset);
  }
  assert.equal(assets.size,7);
});
test('preview never invokes a production API, RPC, assessment, or loader',async()=>{
  const app=await readFile(new URL('./app.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(app,/\bfetch\s*\(|XMLHttpRequest|supabase|\.rpc\s*\(/);
  assert.match(app,/bhw-reference-1-1-review-v1/);
  const server=await readFile(new URL('./serve.mjs',import.meta.url),'utf8');
  assert.match(server,/127\.0\.0\.1/);assert.match(server,/connect-src 'none'/);
});
