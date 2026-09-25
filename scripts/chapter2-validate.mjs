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
  for (const allocation of blueprint.shared_allocations) {
    if (allocation.proposed_minutes) {
      assert(Object.keys(allocation.proposed_minutes).sort().join(',') === [...allocation.subchapters].sort().join(','), 'Shared split must name every allocated subchapter');
      assert(Object.values(allocation.proposed_minutes).every(n=>Number.isInteger(n)&&n>0) && Object.values(allocation.proposed_minutes).reduce((n,v)=>n+v,0)===allocation.hours*60, 'Proposed shared minutes must reconcile to source hours');
    }
  }
  for (const m of modules) for (const l of m.lessons) {
    for (const field of ['title_fil','title_en','task_fil','task_en','practice_en']) assert(l[field]?.trim(), `${l.code}: missing ${field}`);
    assert(l.status === 'authored-draft' || l.status === 'outline', `${l.code}: invalid authoring status`);
    assert(Object.values(l.source_pages).every((p)=>p.length && p.every((n)=>Number.isInteger(n)&&n>0)), `${l.code}: missing source pages`);
  }
  return lessons;
}

export function validateDraftModule(module, moduleDir, review, activities) {
  assert(review.status === 'draft' && review.lessons.every((l)=>l.publication_allowed === false), 'Draft review must prohibit publication');
  const blueprint=json(path.join(packageRoot,'chapter-blueprint.json'));
  const planned=blueprint.modules.find(m=>m.module_key===module.module_key);
  assert(planned, 'Draft module must exist in blueprint');
  const sameKeys=(left,right)=>[...left].sort().join(',')===[...right].sort().join(',');
  const keys=module.lessons.map(l=>l.manifest.lesson_key);
  assert(sameKeys(keys,planned.lessons.map(l=>l.lesson_key)), 'Draft must contain exactly its planned lessons');
  assert(sameKeys(keys,review.lessons.map(l=>l.lesson_key)) && sameKeys(keys,activities.map(a=>a.lesson_key)), 'Review and activities must match every lesson exactly once');
  if(review.lessons.some(l=>l.clinical_content)) validateClinicalEvidence(module,json(path.join(moduleDir,'evidence-review.json')));
  const expectedMinutes=planned.source_allocation_hours!==null?planned.source_allocation_hours*60:blueprint.shared_allocations.find(a=>a.subchapters.includes(planned.code))?.proposed_minutes?.[planned.code];
  assert(expectedMinutes>0 && review.facilitated_minutes===expectedMinutes && activities.every(a=>Number.isInteger(a.minutes)&&a.minutes>0) && activities.reduce((n,a)=>n+a.minutes,0)===expectedMinutes, 'Session allocation must reconcile to source or proposed shared minutes');
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
      for (const name of activity.materials.filter(n=>n!=='job-aid')) assert(existsSync(path.join(dir,`${name}.${lang}.md`)), `${key}: missing ${name}`);
      assert(existsSync(path.join(moduleDir,`job-aid.${lang}.md`)), `${key}: missing job aid`);
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
  const reports=blueprint.modules.filter(m=>m.status==='draft-authored').map(m=>{
    assert(m.lessons.every(l=>l.status==='authored-draft'), `${m.code}: module and lesson authoring statuses must agree`);
    const dir=path.join(packageRoot,'drafts',m.module_key);
    const chapterModule=loadReferenceModule(dir,path.join(root,'public'));
    return {code:m.code,module_key:m.module_key,...validateDraftModule(chapterModule,dir,json(path.join(dir,'review.json')),json(path.join(dir,'activities.json')).activities)};
  });
  assert(reports.reduce((n,r)=>n+r.lessons,0)===blueprint.authored_lesson_count,'Authored count must match validated draft modules');
  const program=json(path.join(root,'content/training/day1-basic-competencies/program.json'));
  const chapter=program.chapters.find((c)=>c.chapter_key==='chapter-2');
  assert(chapter.delivery_course===null && chapter.availability==='unavailable','Chapter 2 must remain isolated from live delivery mapping');
  assert(!existsSync(path.join(packageRoot,'course.json'))&&!existsSync(path.join(packageRoot,'locks')),'Draft package must not acquire live delivery configuration');
  return {status:'passed',scope:'source and authoring validation; not clinical approval or live application testing',planned_lessons:55,lessons:reports.reduce((n,r)=>n+r.lessons,0),read_sections:reports.reduce((n,r)=>n+r.read_sections,0),slides:reports.reduce((n,r)=>n+r.slides,0),checks:reports.reduce((n,r)=>n+r.checks,0),modules:reports};
}

export function validateClinicalEvidence(chapterModule,evidence) {
  const signoff=evidence.clinical_signoff;
  const userAttested=signoff && typeof signoff==='object' && signoff.status==='approved-by-user-attestation' && /^\d{4}-\d{2}-\d{2}$/.test(signoff.date) && /User message:/.test(signoff.evidence) && signoff.reviewer_name===null && signoff.signoff_artifact===null;
  assert(evidence.publication_allowed===false && evidence.independent_clinical_reviewer===null && (signoff===null || userAttested),'Clinical drafts must not invent clinical sign-off');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(evidence.checked_on),'Clinical evidence needs a check date');
  const ids=evidence.sources.map(s=>s.id);
  assert(new Set(ids).size===ids.length && evidence.sources.every(s=>s.url?.startsWith('https://')&&s.accessed_on),'Clinical sources need unique identities, URLs and access dates');
  const keys=new Set(chapterModule.lessons.map(l=>l.manifest.lesson_key));
  const covered=new Set();
  for(const decision of evidence.decisions){
    assert(decision.source_issue&&decision.decision&&decision.remaining,'Clinical decision must retain source issue, disposition and remaining review');
    assert(decision.sources.length&&decision.sources.every(s=>ids.includes(s)),'Clinical decision references an unknown source');
    for(const key of decision.lessons){assert(keys.has(key),'Clinical decision references an unknown lesson');covered.add(key);}
  }
  assert([...keys].every(k=>covered.has(k)),'Every clinical lesson needs a source decision');
  for(const lesson of chapterModule.lessons){
    const cited=new Set(lesson.revision.sources.filter(s=>s.url).map(s=>s.id));
    assert(evidence.decisions.filter(d=>d.lessons.includes(lesson.manifest.lesson_key)).some(d=>d.sources.some(id=>cited.has(id))),'Clinical lesson must cite its verification evidence');
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) console.log(JSON.stringify(validatePackage(),null,2));
