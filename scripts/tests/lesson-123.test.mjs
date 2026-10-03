// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadReferenceModule, parseReferenceRead, FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {planReferenceNarration} from '../lib/reference-narration.mjs';
import {LOCAL_SYSTEM_STORY_STYLES} from '../lib/tts-providers/gemini.mjs';
import {LOCAL_SYSTEM_BEATS} from '../../remotion/src/uhc-local-system/narration.ts';
import {lessonPosition, continueLesson} from '../../src/lib/elearning/reference-navigation';

const root=path.resolve(import.meta.dirname,'../..');
const moduleDir=path.join(root,'content/training/day1-basic-competencies/modules/02-uhc-act');
const dir=path.join(moduleDir,'lessons/uhc-local-system');
const source=JSON.parse(readFileSync(path.join(dir,'lesson.json'),'utf8'));
const manifest=JSON.parse(readFileSync(path.join(root,'content/training/day1-basic-competencies/narration.json'),'utf8'));
const authored=loadReferenceModule(moduleDir,path.join(root,'public')).lessons.find(l=>l.manifest.lesson_key==='uhc-local-system');
const modules=[{key:'02-uhc-act',lessons:[authored]}];
const sha=b=>createHash('sha256').update(b).digest('hex');
const fileHash=src=>existsSync(path.join(root,'public',src.slice(1)))?sha(readFileSync(path.join(root,'public',src.slice(1)))):null;
const ids=['section-5','local-system-board','local-system-observation','local-system-promotion','local-system-feedback','local-system-check'];

describe('lesson 1.2.3 health boards and health promotion',()=>{
  it('ships twelve current Gemini recordings and measured bilingual story assets',()=>{
    for(const options of [{},{provider:'gemini'}])expect(planReferenceNarration(modules,manifest,fileHash,options).every(item=>item.action==='skip')).toBe(true);
    for(const id of ids)for(const language of ['fil','en']){
      const track=manifest.lessons['uhc-local-system'].sections[id][language];
      expect(track.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');
      expect(fileHash(track.src)).toBe(track.sha256);
      expect(track.duration_seconds).toBeGreaterThan(15);
      expect(track.timings.some(t=>t.zone==='heading')).toBe(true);
      expect(track.timings.some(t=>t.zone==='body')).toBe(true);
      expect(track.timings.some(t=>t.zone==='takeaway')).toBe(true);
      expect(track.timings.every(t=>t.end_ms>t.start_ms&&t.end_ms<=track.duration_seconds*1000+2)).toBe(true);
    }
    const story=source.assets.find(a=>a.id===source.featured_asset_id);
    expect(story.id).toBe('local-system-story');expect(story.review_status).toBe('draft');
    expect(fileHash(story.path)).toBe(story.content_hash);
    for(const language of ['fil','en']){
      const video=story.videos[language];const timing=JSON.parse(readFileSync(path.join(root,`remotion/public/uhc-local-system/narration-${language}.json`),'utf8'));
      expect(fileHash(video.path)).toBe(video.content_hash);expect(fileHash(video.captions.path)).toBe(video.captions.content_hash);
      expect(video.duration_s).toBeLessThanOrEqual(90);expect(timing.provider).toBe('gemini');expect(timing.voice).toBe('Kore');
      expect(timing.beats.map(b=>b.text)).toEqual(LOCAL_SYSTEM_BEATS.map(b=>b[language]));
      const vtt=readFileSync(path.join(root,'public',video.captions.path.slice(1)),'utf8');
      for(const b of timing.beats){expect(vtt).toContain(b.text);expect(b.end_ms).toBeGreaterThan(b.start_ms);}
      expect(timing.beats.at(-1).end_ms).toBeLessThanOrEqual(timing.durationSeconds*1000+2);
    }
  });
  it('preserves immutable metadata and the surviving anchor while expanding bilingual coverage',()=>{
    expect(source.manifest).toEqual({lesson_key:'uhc-local-system',position:2,title_fil:'Health board at health promotion',title_en:'Health boards and health promotion',objectives_fil:['Maipaliwanag at mailapat sa isang sitwasyon: health board at health promotion.'],objectives_en:['Explain and apply in a situation: health boards and health promotion.'],required:true});
    expect(source.sections.map(s=>s.id)).toEqual(ids);
    expect(authored.revision.slides.map(s=>s.id)).toEqual(ids.map(id=>'slide-'+id));
    for(const lang of ['fil','en']){
      const read=parseReferenceRead(readFileSync(path.join(dir,`read.${lang}.md`),'utf8'));
      expect(read.map(s=>s.id)).toEqual(ids);
      for(const [i,s] of read.entries())expect(authored.revision.slides[i][`narration_${lang}`]).toBe(s.body);
      const facil=readFileSync(path.join(dir,`facilitator.${lang}.md`),'utf8');
      expect([...facil.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);
    }
    expect(source.coverage.map(c=>c.id).sort()).toEqual(['m2.bhw-skill','m2.competency','m2.health-board','m2.health-promotion']);
    for(const c of source.coverage){expect(c.read_ids.length).toBeGreaterThan(1);for(const id of c.read_ids)expect(source.sections.find(s=>s.id===id).concept_ids).toContain(c.id);}
    expect(source.sources.some(s=>s.title.includes('pending'))).toBe(false);
  });

  it('teaches the correct role boundary and a specific confidentiality/coordination check',()=>{
    const body=authored.revision.read_sections.map(s=>s.body_en).join(' ');
    expect(body).toMatch(/Local Government Code/);
    expect(body).toMatch(/does not automatically sit on or lead a board/);
    expect(body).toMatch(/who should receive her observation/);
    expect(body).not.toMatch(/all the way up to the health board/);
    const check=source.sections.at(-1).check;
    expect(source.sections.slice(0,-1).every(s=>s.check===null)).toBe(true);
    expect(check.options).toHaveLength(4);
    expect(check.options[check.correct_option_index].en).toMatch(/without personal details.*appropriate health-team contact/);
    expect(check.feedback_en).toMatch(/universal route.*confirm who/);
    expect(authored.revision.slides.at(-1).check).toEqual(check);
    const competency=JSON.parse(readFileSync(path.join(dir,'competency.json'),'utf8'));
    expect(competency.observation_indicators).toHaveLength(1);
    expect(competency.observation_indicators.every(i=>i.objective_index===0)).toBe(true);
  });

  it('plans Gemini for every Read section by default, including new sections and copy/style edits',()=>{
    for(const options of [{},{provider:'gemini'}]){
      const plan=planReferenceNarration(modules,manifest,fileHash,options);
      expect(plan).toHaveLength(12);
      for(const item of plan){expect(item.provider).toBe('gemini');expect(item.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');expect(item.speechStyle).toBe(LOCAL_SYSTEM_STORY_STYLES[item.language]);}
    }
    const changed=structuredClone(modules);
    changed[0].lessons[0].revision.read_sections[2].body_en+=' Ask how feedback will arrive.';
    const before=planReferenceNarration(modules,manifest,fileHash).find(i=>i.sectionId==='local-system-observation'&&i.language==='en');
    const edited=planReferenceNarration(changed,manifest,fileHash).find(i=>i.sectionId==='local-system-observation'&&i.language==='en');
    expect(edited.provider).toBe('gemini');expect(edited.action).toBe('render');expect(edited.contentHash).not.toBe(before.contentHash);
    const original=LOCAL_SYSTEM_STORY_STYLES.en;
    try {LOCAL_SYSTEM_STORY_STYLES.en+=' Pause for the observation.';expect(planReferenceNarration(modules,manifest,fileHash).find(i=>i.sectionId===before.sectionId&&i.language==='en').contentHash).not.toBe(before.contentHash);}
    finally {LOCAL_SYSTEM_STORY_STYLES.en=original;}
  });

  it('retains original resume positions and completion by lesson ID across the expanded revision',()=>{
    const lesson={...source.manifest,id:'def4612a-a2af-4764-a735-7c2dec8a20c4',revision:{...authored.revision,id:'new-revision'}};
    for(const mode of ['read','slides'])for(const concept of source.sections[0].concept_ids){
      const saved={lesson_id:lesson.id,lesson_revision_id:'old-revision',modality:mode,position_key:mode==='read'?'section-5':'slide-section-5',concept_id:concept,updated_at:'2026-10-03'};
      expect(lessonPosition(lesson,mode,saved).id).toBe(saved.position_key);
      expect(continueLesson([lesson],[{lesson_id:lesson.id}],[saved])).toBe(null);
    }
    expect(lessonPosition(lesson,'read',{position_key:'removed-position',concept_id:'m2.health-board'}).id).toBe('section-5');
  });

  it('integrates draft original art without inheriting false approval or deleting historical art',()=>{
    const art=source.assets.find(a=>a.id==='local-system-observation-art');
    expect(fileHash(art.path)).toBe(art.content_hash);
    expect(sha(readFileSync(path.join(root,'remotion/public/uhc-local-system/scene.png')))).toBe(art.content_hash);
    expect(art.provenance).toMatch(/built-in imagegen.*2026-10-03.*Vlanche.*Ernesto/);
    expect(art.review_status).toBe('draft');
    expect(source.assets.some(a=>a.id==='practice-map')).toBe(false);
    expect(existsSync(path.join(root,'public/training/bhw-next-draft/process-e56e73f832d7.svg'))).toBe(true);
    const viewer=readFileSync(path.join(root,'src/components/elearning/reference-lessons.tsx'),'utf8');
    expect(viewer.split('lesson?.lesson_key === "uhc-local-system"')[1]).toContain(art.path);
    expect(source.sections.every(s=>s.asset_ids.includes(art.id))).toBe(true);
    expect(LOCAL_SYSTEM_BEATS.map(b=>b.id)).toEqual(['question','roles','observation','promotion','discussion','feedback']);
    expect(LOCAL_SYSTEM_BEATS.every(b=>b.fil&&b.en&&b.title_fil&&b.title_en)).toBe(true);
  });
});
