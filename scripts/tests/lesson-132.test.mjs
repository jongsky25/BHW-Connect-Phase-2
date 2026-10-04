// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadReferenceModule, parseReferenceRead, FACILITATOR_SECTION_IDS} from '../lib/reference-content.mjs';
import {planReferenceNarration, mp3AudioFrames} from '../lib/reference-narration.mjs';
import {BHS_SUPPORT_ENVIRONMENT_STORY_STYLES} from '../lib/tts-providers/gemini.mjs';
import {BHS_SUPPORT_ENVIRONMENT_BEATS} from '../../remotion/src/bhs-support-environment/narration.ts';
import {lessonPosition, continueLesson} from '../../src/lib/elearning/reference-navigation.ts';
import {toWebVtt} from '../lib/webvtt.mjs';

const root=path.resolve(import.meta.dirname,'../..');
const dir=path.join(root,'content/training/day1-basic-competencies/modules/03-polisiya-bhs');
const lessonDir=path.join(dir,'lessons/bhs-support-environment');
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=src=>readFileSync(path.join(root,'public',src.slice(1)));
const fileHash=src=>sha(bytes(src));
const source=json(path.join(lessonDir,'lesson.json'));
const manifest=json(path.join(root,'content/training/day1-basic-competencies/narration.json'));
const authored=loadReferenceModule(dir,path.join(root,'public')).lessons.find(l=>l.manifest.lesson_key==='bhs-support-environment');
const modules=[{key:'03-polisiya-bhs',lessons:[authored]}];
const ids=['section-3','facility-roles','listen-connect','unnecessary-plastic','safe-alternative','check'];

describe('lesson 1.3.2 respectful support and safe environment',()=>{
  it('preserves immutable identity, original position IDs, distinct concepts and bilingual parity',()=>{
    expect(source.manifest).toEqual({lesson_key:'bhs-support-environment',position:1,title_fil:'Breastfeeding at kapaligiran',title_en:'Breastfeeding and the environment',objectives_fil:['Maipaliwanag at mailapat sa isang sitwasyon: breastfeeding at kapaligiran.'],objectives_en:['Explain and apply in a situation: breastfeeding and the environment.'],required:true});
    expect(source.sections.map(s=>s.id)).toEqual(ids);
    expect(authored.revision.slides.map(s=>s.id)).toEqual(ids.map(id=>'slide-'+id));
    expect(source.coverage.map(c=>c.id)).toEqual(['m3.breastfeeding-act','m3.plastics-ban']);
    for(const lang of ['fil','en']) {
      const read=parseReferenceRead(readFileSync(path.join(lessonDir,`read.${lang}.md`),'utf8'));
      expect(read.map(s=>s.id)).toEqual(ids);
      for(const [i,s] of read.entries()) expect(authored.revision.slides[i][`narration_${lang}`]).toBe(s.body);
      expect(read[0].body).toContain('Mimi');
      expect(read.map(s=>s.body).join(' ')).not.toMatch(/Corazon|Vlanche|Ernesto|YAKAP/);
    }
    expect(source.sections.at(-1).check).toEqual(authored.revision.slides.at(-1).check);
    expect(source.sections.at(-1).check.options).toHaveLength(3);
  });

  it('retains old resume locations for both concepts across a changed revision and completed lesson identity',()=>{
    const lesson={...authored.manifest,id:'724b190b-38bb-4ec3-b87b-c73fc657f6c7',revision:{...authored.revision,id:'new-revision'}};
    for(const mode of ['read','slides'])for(const concept of ['m3.breastfeeding-act','m3.plastics-ban']) {
      const position=mode==='read'?'section-3':'slide-section-3';
      expect(lessonPosition(lesson,mode,{lesson_id:lesson.id,revision_id:'old-revision',position_key:position,concept_id:concept,modality:mode}).id).toBe(position);
    }
    expect(continueLesson([lesson],[{lesson_id:lesson.id}],[{lesson_id:lesson.id,updated_at:'2026-10-03'}])).toBeNull();
  });

  it('uses Gemini for newly added screens and preserves it after copy or style edits',()=>{
    const noTracks=planReferenceNarration(modules,{lessons:{}},()=>null);
    expect(noTracks).toHaveLength(12);
    expect(noTracks.every(i=>i.provider==='gemini'&&i.speechStyle===BHS_SUPPORT_ENVIRONMENT_STORY_STYLES[i.language])).toBe(true);
    const changed=structuredClone(modules);
    changed[0].lessons[0].revision.read_sections[0].body_en+=' Ask the supervisor.';
    const edited=planReferenceNarration(changed,manifest,fileHash).find(i=>i.sectionId==='section-3'&&i.language==='en');
    expect(edited.provider).toBe('gemini');expect(edited.action).toBe('render');
    const old=BHS_SUPPORT_ENVIRONMENT_STORY_STYLES.en;
    try {BHS_SUPPORT_ENVIRONMENT_STORY_STYLES.en+=' Pause before confirming.';expect(planReferenceNarration(modules,manifest,fileHash).find(i=>i.language==='en').action).toBe('render');}
    finally {BHS_SUPPORT_ENVIRONMENT_STORY_STYLES.en=old;}
  });

  it('keeps all twelve expressive Gemini Read recordings current with measured authored zones',()=>{
    for(const options of [{},{provider:'gemini'}])for(const item of planReferenceNarration(modules,manifest,fileHash,options)) {
      expect(item.action).toBe('skip');
      expect(item.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');
      expect(item.speechStyle).toContain("Mimi's response");
      expect(item.existing.timings.map(({zone,index,text})=>({zone,index,text}))).toEqual(item.zones);
      const frames=mp3AudioFrames(bytes(item.src));
      const duration=frames.reduce((n,f)=>n+f.samples/f.sampleRate,0);
      expect(item.existing.duration_seconds).toBeCloseTo(duration,3);
      for(const t of item.existing.timings)expect(t.end_ms).toBeGreaterThan(t.start_ms);
      expect(item.existing.timings.at(-1).end_ms).toBeLessThanOrEqual(duration*1000+1);
    }
  });

  it('integrates the original Mimi illustration with an accurate draft review record',()=>{
    const art=source.assets.find(a=>a.id==='mimi-support-environment');
    expect(fileHash(art.path)).toBe(art.content_hash);
    expect(sha(readFileSync(path.join(root,'remotion/public/bhs-support-environment/scene.png')))).toBe(art.content_hash);
    expect(art.provenance).toContain('Exact original generation prompt:');
    expect(art.provenance).toContain('Owner requested character name Mimi');
    expect(['draft','approved']).toContain(art.review_status);
    for(const s of source.sections)expect(s.asset_ids).toContain(art.id);
  });

  it('has bilingual story media, exact captions and measured Gemini beats without introducing unrelated policy content',()=>{
    const asset=source.assets.find(a=>a.id===source.featured_asset_id);
    expect(fileHash(asset.path)).toBe(asset.content_hash);
    for(const lang of ['fil','en']) {
      const video=asset.videos[lang];
      expect(fileHash(video.path)).toBe(video.content_hash);
      expect(fileHash(video.poster.path)).toBe(video.poster.content_hash);
      expect(fileHash(video.captions.path)).toBe(video.captions.content_hash);
      const timing=json(path.join(root,`remotion/public/bhs-support-environment/narration-${lang}.json`));
      expect(timing).toMatchObject({language:lang,provider:'gemini',model:'gemini-3.8-flash-tts',voice:'Kore'});
      expect(timing.beats.map(b=>b.zone)).toEqual(BHS_SUPPORT_ENVIRONMENT_BEATS.map(b=>b.id));
      expect(timing.beats.map(b=>b.text)).toEqual(BHS_SUPPORT_ENVIRONMENT_BEATS.map(b=>b[lang]));
      expect(bytes(video.captions.path).toString('utf8').replaceAll('\r','')).toBe(toWebVtt(timing));
      expect(video.duration_s).toBeGreaterThan(timing.durationSeconds);
      expect(video.duration_s).toBeLessThanOrEqual(90);
    }
  });

  it('uses the fixed facilitation outline with observable role and safety boundaries',()=>{
    for(const lang of ['fil','en']) {
      const notes=readFileSync(path.join(lessonDir,`facilitator.${lang}.md`),'utf8');
      expect([...notes.matchAll(/^## \[([^\]]+)\]/gm)].map(m=>m[1])).toEqual(FACILITATOR_SECTION_IDS);
      expect(notes).toContain('Mimi');expect(notes).toContain('supervisor');
    }
    expect(authored.notes.observation_indicators[0].objective_index).toBe(0);
    expect(authored.notes.observation_indicators[0].not_yet_en).toMatch(/unconfirmed.*imposes.*clinical supplies/);
    expect(source.sources.some(s=>s.title.includes('pending'))).toBe(false);
  });
});
