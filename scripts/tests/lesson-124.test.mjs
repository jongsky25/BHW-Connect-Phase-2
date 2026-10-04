// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadReferenceModule,parseReferenceRead} from '../lib/reference-content.mjs';
import {planReferenceNarration,mp3AudioFrames} from '../lib/reference-narration.mjs';
import {UHC_IMPROVEMENT_STORY_STYLES} from '../lib/tts-providers/gemini.mjs';
import {UHC_IMPROVEMENT_BEATS} from '../../remotion/src/uhc-improvement/narration.ts';
import {toWebVtt} from '../lib/webvtt.mjs';
import {lessonPosition,continueLesson} from '../../src/lib/elearning/reference-navigation.ts';
const root=path.resolve(import.meta.dirname,'../..');
const dir=path.join(root,'content/training/day1-basic-competencies/modules/02-uhc-act');
const ld=path.join(dir,'lessons/uhc-improvement');
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const bytes=src=>readFileSync(path.join(root,'public',src.slice(1)));
const fileHash=src=>createHash('sha256').update(bytes(src)).digest('hex');
const manifest=json(path.join(root,'content/training/day1-basic-competencies/narration.json'));
const source=json(path.join(ld,'lesson.json'));
const authored=loadReferenceModule(dir,path.join(root,'public')).lessons.find(l=>l.manifest.lesson_key==='uhc-improvement');
const modules=[{key:'02-uhc-act',lessons:[authored]}];
const ids=['section-6','section-7','improvement-confirm','improvement-plan','improvement-feedback','improvement-check'];
describe('lesson 1.2.4 improvement planning',()=>{
  it('preserves published metadata, original anchors and bilingual coverage while expanding the planning cycle',()=>{
    expect(source.manifest).toEqual({lesson_key:'uhc-improvement',position:3,title_fil:'Maliit na hakbang sa pagpapabuti',title_en:'One practical improvement',objectives_fil:['Maipaliwanag at mailapat sa isang sitwasyon: maliit na hakbang sa pagpapabuti.'],objectives_en:['Explain and apply in a situation: one practical improvement.'],required:true});
    expect(source.sections.map(s=>s.id)).toEqual(ids);
    expect(authored.revision.slides.map(s=>s.id)).toEqual(ids.map(id=>'slide-'+id));
    for(const lang of ['fil','en']) {
      const read=parseReferenceRead(readFileSync(path.join(ld,`read.${lang}.md`),'utf8'));
      expect(read.map(s=>s.id)).toEqual(ids);
      for(const [i,s] of read.entries()) expect(authored.revision.slides[i][`narration_${lang}`]).toBe(s.body);
    }
    expect(source.coverage[0]).toMatchObject({id:'m2.competency',read_ids:ids,slide_ids:ids.map(id=>'slide-'+id)});
    for(const s of source.sections) expect(s.concept_ids).toContain('m2.competency');
  });
  it('uses a distinct practical plan check with a concrete supported action and plausible failure modes',()=>{
    const c=source.sections.at(-1).check;
    expect(c.correct_option_index).toBe(1);
    expect(c.options).toHaveLength(4);
    expect(c.options[1].en).toMatch(/Confirm.*midwife.*feasible.*Friday.*questions remain/);
    expect(c.options[0].en).toMatch(/every service is free/);
    expect(c.options[2].en).toMatch(/process immediately/);
    expect(c.options[3].en).toMatch(/all activities.*later/);
    expect(authored.revision.slides.at(-1).check).toEqual(c);
    expect(source.sections[1].check).toBeNull();
    for(const lang of ['fil','en']) expect(readFileSync(path.join(ld,`facilitator.${lang}.md`),'utf8')).toContain(lang==='fil'?'ikalawang opsyon':'second option');
  });
  it('resolves new sections to Gemini by default and shares expressive Read/video style',()=>{
    for(const options of [{},{provider:'gemini'}]) {
      const plan=planReferenceNarration(modules,{lessons:{}},()=>null,options);
      expect(plan).toHaveLength(12);
      for(const item of plan) {
        expect(item.provider).toBe('gemini');
        expect(item.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');
        expect(item.speechStyle).toBe(UHC_IMPROVEMENT_STORY_STYLES[item.language]);
        expect(item.speechStyle).toMatch(/Vlanche.*midwife.*pitch.*feedback/);
      }
    }
    // Explicit provider selection remains available for the general planner.
    expect(planReferenceNarration(modules,{lessons:{}},()=>null,{provider:'edge'})[0].provider).toBe('edge');
  });
  it('retains original resume positions across revisions and preserves completion identity',()=>{
    const lesson={...authored.manifest,id:'d23d3ff0-64b0-4823-8c23-710b728a59d2',revision:{...authored.revision,id:'new-revision'}};
    for(const mode of ['read','slides']) for(const id of ids.slice(0,2)) {
      const saved={lesson_id:lesson.id,revision_id:'old-revision',modality:mode,position_key:mode==='read'?id:'slide-'+id,concept_id:'m2.competency'};
      expect(lessonPosition(lesson,mode,saved).id).toBe(saved.position_key);
    }
    expect(continueLesson([lesson],[{lesson_id:lesson.id,revision_id:'old-revision'}],[])).toBeNull();
  });
  it('uses original draft topic artwork and labels observed skill separately from online completion',()=>{
    const art=source.assets.find(a=>a.id==='improvement-planning');
    expect(['draft','approved']).toContain(art.review_status);
    expect(createHash('sha256').update(readFileSync(path.join(root,'public',art.path.slice(1)))).digest('hex')).toBe(art.content_hash);
    expect(art.provenance).toMatch(/imagegen.*2026-10-03.*Vlanche.*Prompt:/);
    expect(source.assets.some(a=>a.id==='practice-map')).toBe(false);
    const obs=json(path.join(ld,'competency.json')).observation_indicators[0];
    expect(obs.objective_index).toBe(0);
    expect(obs.levels.kaya_na_en).toMatch(/agreement.*time\/materials.*indicator.*feedback/);
    const outline=['purpose','time-materials','prepare','opening','steps','expected-answers','misconception','practice','answer-key','observe','support','sources-review'];
    for(const lang of ['fil','en']) expect([...readFileSync(path.join(ld,`facilitator.${lang}.md`),'utf8').matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(outline);
  });  it('keeps all twelve expressive Gemini tracks current with either provider selection',()=>{
    for(const options of [{},{provider:'gemini'}]) {
      const plan=planReferenceNarration(modules,manifest,fileHash,options);
      expect(plan).toHaveLength(12);
      for(const item of plan) {
        expect(item.action).toBe('skip');
        expect(item.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');
        expect(item.speechStyle).toBe(UHC_IMPROVEMENT_STORY_STYLES[item.language]);
        expect(item.speechStyle).toMatch(/Vlanche/);
        expect(item.existing.timings.map(({zone,index,text})=>({zone,index,text}))).toEqual(item.zones);
        const frames=mp3AudioFrames(bytes(item.src));
        const duration=frames.reduce((n,f)=>n+f.samples/f.sampleRate,0);
        expect(item.existing.duration_seconds).toBeCloseTo(duration,3);
        for(const timing of item.existing.timings) expect(timing.end_ms).toBeGreaterThan(timing.start_ms);
        expect(item.existing.timings.at(-1).end_ms).toBeLessThanOrEqual(duration*1000+1);
      }
    }
  });

  it('retains Gemini and invalidates audio after a text or style change',()=>{
    const changed=structuredClone(modules);
    changed[0].lessons[0].revision.read_sections[0].body_en+=' Ask the health team.';
    const changedItem=planReferenceNarration(changed,manifest,fileHash).find(i=>i.sectionId==='section-6'&&i.language==='en');
    expect(changedItem.provider).toBe('gemini');
    expect(changedItem.action).toBe('render');
    const oldStyle=UHC_IMPROVEMENT_STORY_STYLES.en;
    try {
      UHC_IMPROVEMENT_STORY_STYLES.en+=' Pause before the checks.';
      const styled=planReferenceNarration(modules,manifest,fileHash).find(i=>i.sectionId==='section-6'&&i.language==='en');
      expect(styled.action).toBe('render');
      expect(styled.contentHash).not.toBe(manifest.lessons['uhc-improvement'].sections['section-6'].en.content_hash);
    } finally {UHC_IMPROVEMENT_STORY_STYLES.en=oldStyle;}
  });

  it('has both featured videos and captions aligned with the measured Gemini scripts',()=>{
    const asset=source.assets.find(a=>a.id===source.featured_asset_id);
    expect(asset.provenance).toMatch(/Gemini TTS.*gemini-3\.8-flash-tts.*Kore/);
    expect(fileHash(asset.path)).toBe(asset.content_hash);
    for(const lang of ['fil','en']) {
      const video=asset.videos[lang];
      expect(fileHash(video.path)).toBe(video.content_hash);
      expect(fileHash(video.poster.path)).toBe(video.poster.content_hash);
      expect(video.poster.path).toContain(`uhc-improvement-gemini-${lang}-`);
      expect(fileHash(video.captions.path)).toBe(video.captions.content_hash);
      const timings=json(path.join(root,`remotion/public/uhc-improvement/narration-${lang}.json`));
      expect(timings).toMatchObject({language:lang,provider:'gemini',model:'gemini-3.8-flash-tts',voice:'Kore'});
      expect(timings.style.startsWith(UHC_IMPROVEMENT_STORY_STYLES[lang])).toBe(true);
      expect(timings.beats.map(b=>b.zone)).toEqual(UHC_IMPROVEMENT_BEATS.map(b=>b.id));
      expect(timings.beats.map(b=>b.text)).toEqual(UHC_IMPROVEMENT_BEATS.map(b=>b[lang]));
      expect(bytes(video.captions.path).toString('utf8').replaceAll('\r','')).toBe(toWebVtt(timings));
      expect(video.duration_s).toBeGreaterThan(timings.durationSeconds);
      expect(video.duration_s).toBeLessThanOrEqual(90);
    }
  });
});
