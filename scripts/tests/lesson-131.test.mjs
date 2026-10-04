// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadReferenceModule, parseReferenceRead, FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {planReferenceNarration, buildManifest, referencedSources} from '../lib/reference-narration.mjs';
import {narrationForLesson} from '../../src/lib/elearning/reference-narration.ts';
import {timingsMatchSection} from '../../src/lib/elearning/narration-zones.ts';
import {BHS_PROMOTIONS_STORY_STYLES} from '../lib/tts-providers/gemini.mjs';
import {BHS_PROMOTIONS_BEATS} from '../../remotion/src/bhs-promotions/narration.ts';
import {lessonPosition, continueLesson} from '../../src/lib/elearning/reference-navigation.ts';
import {toWebVtt} from '../lib/webvtt.mjs';
const root=path.resolve(import.meta.dirname,'../..');
const folder=path.join(root,'content/training/day1-basic-competencies/modules/03-polisiya-bhs');
const dir=path.join(folder,'lessons/bhs-promotions');
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const source=json(path.join(dir,'lesson.json'));
const authored=loadReferenceModule(folder,path.join(root,'public')).lessons.find(l=>l.manifest.lesson_key==='bhs-promotions');
const modules=[{key:'03-polisiya-bhs',lessons:[authored]}];
const ids=['section-1','section-2','identify-offer','pause-route','independent-information','recognition-check'];
describe('lesson 1.3.1 recognizing and routing a company offer',()=>{
  it('keeps exact-text audio for published siblings and selects Mimi after their revision changes',()=>{
    const manifest=json(path.join(root,'content/training/day1-basic-competencies/narration.json'));
    const published=json(path.join(root,'scripts/tests/fixtures/lesson-131-published-siblings.json'));
    const current=loadReferenceModule(folder,path.join(root,'public')).lessons;
    for(const sibling of published)for(const lang of ['fil','en']){
      const oldAudio=narrationForLesson(manifest,sibling.lesson_key,lang,sibling.read_sections);
      for(const section of sibling.read_sections){
        const track=oldAudio[section.id];
        expect(track.src).toBe(manifest.history[sibling.lesson_key][0].sections[section.id][lang].src);
        expect(timingsMatchSection(track.timings,{heading:section[`heading_${lang}`],body:section[`body_${lang}`],takeaway:section[`takeaway_${lang}`]})).toBe(true);
      }
      const next=current.find(l=>l.manifest.lesson_key===sibling.lesson_key);
      const newAudio=narrationForLesson(manifest,sibling.lesson_key,lang,next.revision.read_sections);
      for(const section of next.revision.read_sections){
        expect(newAudio[section.id].src).toBe(manifest.lessons[sibling.lesson_key].sections[section.id][lang].src);
        expect(newAudio[section.id].src).not.toBe(oldAudio[section.id]?.src);
      }
      const unknown=structuredClone(sibling.read_sections);unknown[0][`body_${lang}`]+=' An unrecorded revision.';
      expect(narrationForLesson(manifest,sibling.lesson_key,lang,unknown)[unknown[0].id]).toBeUndefined();
    }
    const rebuilt=buildManifest(manifest,[],[]);
    expect(rebuilt.history).toEqual(manifest.history);
    const keep=referencedSources(rebuilt);
    for(const versions of Object.values(manifest.history))for(const version of versions)for(const tracks of Object.values(version.sections))for(const track of Object.values(tracks)){
      expect(keep.has(track.src)).toBe(true);
      expect(createHash('sha256').update(readFileSync(path.join(root,'public',track.src))).digest('hex')).toBe(track.sha256);
    }
  });
  it('binds owner release approval to the exact reviewed media bytes',()=>{
    const approval=json(path.join(root,'docs/lesson-131-owner-approval.json'));
    expect(approval.status).toBe('owner_approved_for_live_release');
    expect(approval.lesson_key).toBe('bhs-promotions');
    expect(approval.independent_sme_approval).toBeNull();
    for(const [media,hash] of Object.entries(approval.approved_media_sha256)){
      expect(createHash('sha256').update(readFileSync(path.join(root,'public',media))).digest('hex')).toBe(hash);
    }
    for(const asset of source.assets){
      expect(asset.review_status).toBe('approved');
      expect(asset.caption_en).not.toMatch(/draft|awaiting/i);
      expect(asset.provenance).toContain('2026-10-04');
    }
  });
  it('ships both language stories with exact script, timing, caption and media hash parity',()=>{
    const story=source.assets.find(a=>a.id===source.featured_asset_id);
    expect(story.review_status).toBe('approved');
    for(const lang of ['fil','en']){
      const timing=json(path.join(root,`remotion/public/bhs-promotions/narration-${lang}.json`));
      expect(timing.provider).toBe('gemini');
      expect(timing.model).toBe('gemini-3.8-flash-tts');
      expect(timing.voice).toBe('Kore');
      expect(timing.durationSeconds).toBeGreaterThan(60);
      expect(timing.durationSeconds).toBeLessThan(89);
      expect(timing.beats.map(b=>b.text)).toEqual(BHS_PROMOTIONS_BEATS.map(b=>b[lang]));
      const video=story.videos[lang];
      for(const media of [video,video.captions])expect(createHash('sha256').update(readFileSync(path.join(root,'public',media.path.slice(1)))).digest('hex')).toBe(media.content_hash);
      expect(readFileSync(path.join(root,'public',video.captions.path.slice(1)),'utf8')).toBe(toWebVtt(timing));
      expect(readFileSync(path.join(root,'remotion/src/Root.tsx'),'utf8')).toContain('BhsPromotionsStoryEn');
    }
  });
  it('retains old Read/Slides resume positions and saved lesson completion across expansion',()=>{
    const lesson={...authored.manifest,id:'03132db5-003e-409c-986a-0361c83219d0',revision:{...authored.revision,id:'new-draft-revision'}};
    for(const [mode,id] of [['read','section-2'],['slides','slide-section-2']]){
      const saved={lesson_id:lesson.id,revision_id:'old-published-revision',modality:mode,position_key:id,concept_id:'m3.pharma-ban',updated_at:'2026-10-03'};
      expect(lessonPosition(lesson,mode,saved).id).toBe(id);
      expect(continueLesson([lesson],[],[saved])).toBe(lesson);
      expect(continueLesson([lesson],[{lesson_id:lesson.id,revision_id:'old-published-revision'}],[saved])).toBeNull();
      expect(saved.revision_id).toBe('old-published-revision');
    }
  });
  it('uses Mimi throughout all authored 1.3 learner and facilitator references',()=>{
    const referenceModule=loadReferenceModule(folder,path.join(root,'public'));
    for(const lesson of referenceModule.lessons){
      const teaching=JSON.stringify({read:lesson.revision.read_sections,slides:lesson.revision.slides,facilitator:lesson.revision.facilitator_notes,competency:lesson.revision.observation_indicators});
      expect(teaching).not.toMatch(/Corazon/i);
    }
    for(const lang of ['fil','en'])expect(readFileSync(path.join(folder,`lesson.${lang}.md`),'utf8')).not.toMatch(/Corazon/i);
    for(const key of ['bhs-promotions','bhs-decline','bhs-resources'])expect(readFileSync(path.join(folder,'lessons',key,'read.en.md'),'utf8')).toContain('Mimi');
  });
  it('preserves published metadata, original positions and bilingual screen alignment',()=>{
    expect(source.manifest).toEqual({lesson_key:'bhs-promotions',position:0,title_fil:'Pagkilala sa alok ng kumpanya',title_en:'Recognizing a company offer',objectives_fil:['Maipaliwanag at mailapat sa isang sitwasyon: pagkilala sa alok ng kumpanya.'],objectives_en:['Explain and apply in a situation: recognizing a company offer.'],required:true});
    expect(source.sections.map(s=>s.id)).toEqual(ids);
    expect(authored.revision.slides.map(s=>s.id)).toEqual(ids.map(id=>'slide-'+id));
    for(const lang of ['fil','en']){
      const read=parseReferenceRead(readFileSync(path.join(dir,`read.${lang}.md`),'utf8'));
      expect(read.map(s=>s.id)).toEqual(ids);
      read.forEach((section,i)=>expect(authored.revision.slides[i][`narration_${lang}`]).toBe(section.body));
      expect(read[0].body).toContain('Mimi');
      expect(read.map(s=>s.body).join(' ')).not.toMatch(/Vlanche|Ernesto|Riza|YAKAP|audit pending|require primary-source review/);
    }
  });
  it('retains both required concepts with audited sources and a distinct two-offer check',()=>{
    expect(source.coverage.map(c=>c.id)).toEqual(['m3.milk-code','m3.pharma-ban']);
    for(const c of source.coverage){
      expect(c.read_ids).toEqual(ids);
      expect(c.slide_ids).toEqual(ids.map(id=>'slide-'+id));
      c.source_ids.forEach(id=>expect(source.sources.some(s=>s.id===id)).toBe(true));
    }
    const check=source.sections.at(-1).check;
    expect(check.prompt_en).toMatch(/Offers A and B/);
    expect(check.options).toHaveLength(3);
    expect(check.options[check.correct_option_index].en).toMatch(/supervisor.*conditions.*authorization/);
    expect(check.feedback_en).toMatch(/formula samples.*BHS.*gift/);
    expect(authored.revision.slides.at(-1).check).toEqual(check);
    const policy=authored.revision.read_sections.map(s=>s.body_en).join(' ');
    expect(policy).toMatch(/prescription pharmaceutical products and medical devices/);
    expect(policy).toMatch(/exception for scientific conventions/);
    expect(policy).toMatch(/only licensed physicians and dentists/);
    expect(policy).toMatch(/Do not blame families/);
    expect(policy).toMatch(/cannot create an exception independently/);
  });
  it('defaults every new target track to expressive Gemini and retains it after copy edits',()=>{
    const plan=planReferenceNarration(modules,{lessons:{}},()=>null);
    expect(plan).toHaveLength(12);
    plan.forEach(item=>{
      expect(item.provider).toBe('gemini');
      expect(item.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');
      expect(item.speechStyle).toContain(BHS_PROMOTIONS_STORY_STYLES[item.language]);
      if(item.sectionId==='section-2'&&item.language==='fil')expect(item.speechStyle).toContain('zero zero five three');
      expect(item.speechStyle).toMatch(/Mimi.*calm.*supervisor/);
    });
    const manifest={lessons:{'bhs-promotions':{sections:{}}}};
    for(const item of plan)(manifest.lessons['bhs-promotions'].sections[item.sectionId]??={})[item.language]={voice:item.voice,content_hash:item.contentHash,src:item.src,sha256:'fixture'};
    const changed=structuredClone(modules);
    changed[0].lessons[0].revision.read_sections[2].body_en+=' Ask who can confirm the audience.';
    const altered=planReferenceNarration(changed,manifest,()=> 'fixture').find(i=>i.sectionId==='identify-offer'&&i.language==='en');
    expect(altered.provider).toBe('gemini');
    expect(altered.action).toBe('render');
    expect(altered.contentHash).not.toBe(plan.find(i=>i.sectionId==='identify-offer'&&i.language==='en').contentHash);
    const old=BHS_PROMOTIONS_STORY_STYLES.en;
    try{
      BHS_PROMOTIONS_STORY_STYLES.en+=' Pause before the decision.';
      expect(planReferenceNarration(modules,manifest,()=> 'fixture').find(i=>i.language==='en').action).toBe('render');
    }finally{BHS_PROMOTIONS_STORY_STYLES.en=old;}
    const other=structuredClone(modules);
    other[0].lessons[0].manifest.lesson_key='unconfigured-lesson';
    expect(planReferenceNarration(other,{lessons:{}},()=>null).every(i=>i.provider==='edge')).toBe(true);
  });
  it('selects twelve current real Gemini files with authored zone timings on default and explicit reruns',()=>{
    const manifest=json(path.join(root,'content/training/day1-basic-competencies/narration.json'));
    const fileHash=src=>createHash('sha256').update(readFileSync(path.join(root,'public',src.slice(1)))).digest('hex');
    for(const options of [{},{provider:'gemini'}]){
      const plan=planReferenceNarration(modules,manifest,fileHash,options);
      expect(plan).toHaveLength(12);
      plan.forEach(item=>{
        expect(item.action).toBe('skip');
        expect(item.existing.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');
        expect(item.existing.timings.map(({zone,index,text})=>({zone,index,text}))).toEqual(item.zones);
        expect(item.existing.timings.every(t=>t.end_ms>t.start_ms)).toBe(true);
        expect(item.existing.duration_seconds).toBeGreaterThan(20);
      });
    }
  });
  it('uses original content-hashed art and retains the historical SVG',()=>{
    const art=source.assets.find(a=>a.id==='mimi-company-offer');
    const bytes=readFileSync(path.join(root,'public',art.path.slice(1)));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(art.content_hash);
    expect(bytes.subarray(1,4).toString()).toBe('PNG');
    expect(createHash('sha256').update(readFileSync(path.join(root,'remotion/public/bhs-promotions/scene.png'))).digest('hex')).toBe(art.content_hash);
    expect(art.review_status).toBe('approved');
    expect(art.provenance).toMatch(/built-in imagegen.*2026-10-03.*Owner-approved fictional Mimi/);
    expect(source.assets.some(a=>a.id==='practice-map')).toBe(false);
    expect(readFileSync(path.join(root,'public/training/bhw-next-draft/process-e56e73f832d7.svg')).length).toBeGreaterThan(0);
    expect(readFileSync(path.join(root,'src/components/elearning/reference-lessons.tsx'),'utf8')).toContain(art.path);
  });
  it('aligns facilitation, observable role limits and the animation with this topic',()=>{
    for(const lang of ['fil','en']){
      const headings=parseReferenceRead(readFileSync(path.join(dir,`facilitator.${lang}.md`),'utf8'));
      expect(headings.map(s=>s.id)).toEqual(FACILITATOR_SECTION_IDS);
    }
    const competency=json(path.join(dir,'competency.json'));
    expect(competency.observation_indicators[0].objective_index).toBe(0);
    expect(competency.observation_indicators[0].levels.kaya_na_en).toMatch(/four details.*coordination.*role boundary/);
    expect(BHS_PROMOTIONS_BEATS.map(b=>b.id)).toEqual(['offer','policy-topics','identify','pause','information','summary']);
    expect(BHS_PROMOTIONS_BEATS.map(b=>b.en).join(' ')).toMatch(/Mimi.*different scopes.*four details.*supervisor.*patient data.*does not approve independently/);
  });
});
