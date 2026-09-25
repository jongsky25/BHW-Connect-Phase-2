import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadReferenceModule, parseReferenceRead } from './lib/reference-content.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const packageRoot = path.join(root, 'content/training/chapter2-common-competencies');
export const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const assert = (value, message) => { if (!value) throw new Error(message); };
const words = (text) => text.trim().split(/\s+/u).filter(Boolean).length;

export function validateBlueprint(blueprint) {
  const modules = blueprint.modules;
  const lessons = modules.flatMap((m) => m.lessons);
  assert(modules.length === 7 && lessons.length === 55, 'Expected seven subchapters and 55 lesson boundaries');
  assert(blueprint.planned_lesson_count === lessons.length, 'Planned lesson count mismatch');
  assert(blueprint.authored_lesson_count === lessons.filter((l) => l.status === 'authored-draft').length, 'Authored lesson count mismatch');
  for (const field of ['code', 'lesson_key', 'objective_id', 'practice_id']) {
    assert(new Set(lessons.map((l) => l[field])).size === lessons.length, `Duplicate ${field}`);
  }
  assert(blueprint.publication_allowed === false && blueprint.availability === 'unavailable', 'Draft chapter must not activate');
  assert(blueprint.competency_groups.reduce((n, c) => n + c.hours, 0) === 42, 'Source competency allocation must total 42 hours');
  assert(modules.reduce((n,m)=>n+(m.source_allocation_hours ?? 0),0) + blueprint.shared_allocations.reduce((n,a)=>n+a.hours,0) === 42, 'Subchapter allocations must not double-count shared hours');
  for (const m of modules) for (const l of m.lessons) {
    for (const field of ['title_fil','title_en','task_fil','task_en','practice_en']) assert(l[field]?.trim(), `${l.code}: missing ${field}`);
    assert(l.status === 'authored-draft' || l.status === 'outline', `${l.code}: invalid authoring status`);
    assert(Object.values(l.source_pages).every((p)=>p.length && p.every((n)=>Number.isInteger(n)&&n>0)), `${l.code}: missing source pages`);
  }
  return lessons;
}

export function validateDraftModule(module, moduleDir, review, activities) {
  assert(review.status === 'draft' && review.lessons.every((l)=>l.publication_allowed === false), 'Draft review must prohibit publication');
  assert(module.lessons.length === 4, 'Behavior draft must contain all four planned lessons');
  assert(review.facilitated_minutes === 600 && activities.reduce((n,a)=>n+a.minutes,0) === 600, 'Behavior session allocation must reconcile to 600 minutes');
  const diagnostics = [];
  let sectionCount=0, checkCount=0, slideCount=0;
  for (const lesson of module.lessons) {
    const key=lesson.manifest.lesson_key;
    const dir=path.join(moduleDir,'lessons',key);
    const activity=activities.find((a)=>a.lesson_key===key);
    assert(activity && activity.objective_index===0, `${key}: missing activity/objective mapping`);
    assert(activity.indicator_ref===`lessons/${key}/competency.json#/observation_indicators/0`, `${key}: wrong canonical indicator reference`);
    assert(lesson.revision.assets.length>0 && lesson.revision.assets.every((a)=>a.review_status==='draft'), `${key}: asset approval must not be invented`);
    const practice=json(path.join(dir,'practice.json'));
    const checks=lesson.revision.read_sections.filter((s)=>s.check);
    assert(practice.checks.length===checks.length, `${key}: per-option feedback mismatch`);
    for (const s of checks) {
      const f=practice.checks.find((c)=>c.section_id===s.id)?.feedback_by_option;
      assert(f?.length===s.check.options.length && f.every((x)=>x.fil&&x.en), `${key}: every option needs bilingual feedback`);
      const slide=lesson.revision.slides.find((x)=>x.id===`slide-${s.id}`);
      assert(JSON.stringify(slide?.check)===JSON.stringify(s.check), `${key}: mode check mismatch`);
    }
    for (const lang of ['fil','en']) {
      const guide=lesson.notes[`notes_${lang}`];
      assert(words(guide)<=800, `${key}/${lang}: facilitator guide exceeds 800 words`);
      const indicator=lesson.notes.observation_indicators[0];
      for (const text of [indicator[`observable_${lang}`],...['kaya_na','kailangan_practice','hindi_pa'].map((k)=>indicator.levels[`${k}_${lang}`])]) assert(guide.includes(text), `${key}/${lang}: guide/indicator drift`);
      assert(!/sources-review|review_status|Draft for review/.test(parseReferenceRead(guide).map(s=>s.body).join('\n')), `${key}: editorial metadata in guide body`);
      for (const name of ['participant-cards','observer-sheet']) assert(existsSync(path.join(dir,`${name}.${lang}.md`)), `${key}: missing ${name}`);
      for (const s of lesson.revision.read_sections) {
        const body=s[`body_${lang}`];
        assert(!/draft|review_status|PDF page|github\.com/i.test(body), `${key}: editorial text in learner content`);
        if(lang==='fil') assert(words(body)<=80, `${key}/${s.id}: Filipino Read section exceeds 80 words`);
      }
      for (const s of lesson.revision.slides) {
        const lines=s[`display_${lang}`].split('\n');
        assert(lines.length<=4&&lines.every((line)=>line.length<=70)&&s[`display_${lang}`].length<=280, `${key}/${s.id}/${lang}: slide density exceeds target`);
      }
      const sentences=lesson.revision.read_sections.flatMap((s)=>s[`body_${lang}`].split(/[.!?]+[”"]?\s*/u).filter(Boolean));
      diagnostics.push({lesson:key,language:lang,read_words:lesson.revision.read_sections.reduce((n,s)=>n+words(s[`body_${lang}`]),0),guide_words:words(guide),sentences_over_20:sentences.filter((s)=>words(s)>20).length,sentence_count:sentences.length});
      if(lang==='fil') {
        assert(sentences.every((s)=>words(s)<=30), `${key}: Filipino sentence exceeds 30 words`);
        assert(sentences.filter((s)=>words(s)<=20).length/sentences.length>=0.9, `${key}: less than 90% short Filipino sentences`);
      }
    }
    const ids=lesson.revision.read_sections.map((s)=>s.id);
    assert(ids.at(-1)==='next-step' && ids.includes('example') && ids.includes('scene'), `${key}: incomplete lesson arc`);
    let gap=0;
    for(const s of lesson.revision.read_sections){gap++;if(s.check){assert(gap<=3,`${key}: checks spaced too far apart`);gap=0;}}
    sectionCount+=lesson.revision.read_sections.length;checkCount+=checks.length;slideCount+=lesson.revision.slides.length;
  }
  for (const lang of ['fil','en']) {
    const checks=module.lessons.flatMap(l=>l.revision.read_sections.filter(s=>s.check).map(s=>s.check));
    const longest=checks.filter(c=>c.options[c.correct_option_index][lang].length===Math.max(...c.options.map(o=>o[lang].length))).length;
    assert(longest/checks.length<=0.35, `${lang}: correct option is longest too often`);
  }
  return {lessons:module.lessons.length,read_sections:sectionCount,slides:slideCount,checks:checkCount,diagnostics};
}

export function validatePackage() {
  const blueprint=json(path.join(packageRoot,'chapter-blueprint.json'));
  validateBlueprint(blueprint);
  const dir=path.join(packageRoot,'drafts/01-difficult-situations');
  const chapterModule=loadReferenceModule(dir,path.join(root,'public'));
  const report=validateDraftModule(chapterModule,dir,json(path.join(dir,'review.json')),json(path.join(dir,'activities.json')).activities);
  const program=json(path.join(root,'content/training/day1-basic-competencies/program.json'));
  const chapter=program.chapters.find((c)=>c.chapter_key==='chapter-2');
  assert(chapter.delivery_course===null && chapter.availability==='unavailable','Chapter 2 must remain isolated from live delivery mapping');
  assert(!existsSync(path.join(packageRoot,'course.json'))&&!existsSync(path.join(packageRoot,'locks')),'Draft package must not acquire live delivery configuration');
  return {status:'passed',scope:'source and authoring validation; not clinical approval or live application testing',planned_lessons:55,...report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) console.log(JSON.stringify(validatePackage(),null,2));
