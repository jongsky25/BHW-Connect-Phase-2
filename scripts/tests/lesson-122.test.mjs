// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadReferenceModule, parseReferenceRead} from '../lib/reference-content.mjs';
import {planReferenceNarration, mp3AudioFrames} from '../lib/reference-narration.mjs';
import {PRIMARY_CARE_STORY_STYLES} from '../lib/tts-providers/gemini.mjs';
import {PRIMARY_CARE_BEATS} from '../../remotion/src/uhc-primary-care/narration.ts';
import {toWebVtt} from '../lib/webvtt.mjs';

const root=path.resolve(import.meta.dirname,'../..');
const relative='content/training/day1-basic-competencies/modules/02-uhc-act';
const dir=path.join(root,relative);
const lessonDir=path.join(dir,'lessons/uhc-primary-care');
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=src=>readFileSync(path.join(root,'public',src.slice(1)));
const fileHash=src=>sha(bytes(src));
const source=json(path.join(lessonDir,'lesson.json'));
const manifest=json(path.join(root,'content/training/day1-basic-competencies/narration.json'));
const authored=loadReferenceModule(dir,path.join(root,'public')).lessons.find(l=>l.manifest.lesson_key==='uhc-primary-care');
const modules=[{key:'02-uhc-act',lessons:[authored]}];

describe('lesson 1.2.2 primary care and referral',()=>{
  it('preserves published identity and the bilingual six-screen journey',()=>{
    expect(source.manifest).toEqual({lesson_key:'uhc-primary-care',position:1,title_fil:'Primary care at referral',title_en:'Primary care and referral',objectives_fil:['Maipaliwanag at mailapat sa isang sitwasyon: primary care at referral.'],objectives_en:['Explain and apply in a situation: primary care and referral.'],required:true});
    expect(source.sections.map(s=>s.id)).toEqual(['bridge','outpatient','provider','referral','local','check']);
    expect(authored.revision.slides.map(s=>s.id)).toEqual(source.sections.map(s=>'slide-'+s.id));
    for(const lang of ['fil','en']) {
      const read=parseReferenceRead(readFileSync(path.join(lessonDir,`read.${lang}.md`),'utf8'));
      expect(read.map(s=>s.id)).toEqual(source.sections.map(s=>s.id));
      for(const [i,section] of read.entries()) expect(authored.revision.slides[i][`narration_${lang}`]).toBe(section.body);
    }
    expect(authored.revision.slides.at(-1).check).toEqual(source.sections.at(-1).check);
    expect(source.sections.at(-1).check.prompt_en).toMatch(/primary care clinic.*selected/);
  });

  it('keeps all twelve expressive Gemini tracks current with either provider selection',()=>{
    for(const options of [{},{provider:'gemini'}]) {
      const plan=planReferenceNarration(modules,manifest,fileHash,options);
      expect(plan).toHaveLength(12);
      for(const item of plan) {
        expect(item.action).toBe('skip');
        expect(item.voice).toBe('gemini:gemini-3.8-flash-tts:Kore');
        expect(item.speechStyle).toBe(PRIMARY_CARE_STORY_STYLES[item.language]);
        expect(item.speechStyle).toMatch(/Vlanche.*calm|Vlanche's calm/);
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
    const changedItem=planReferenceNarration(changed,manifest,fileHash).find(i=>i.sectionId==='bridge'&&i.language==='en');
    expect(changedItem.provider).toBe('gemini');
    expect(changedItem.action).toBe('render');
    const oldStyle=PRIMARY_CARE_STORY_STYLES.en;
    try {
      PRIMARY_CARE_STORY_STYLES.en+=' Pause before the checks.';
      const styled=planReferenceNarration(modules,manifest,fileHash).find(i=>i.sectionId==='bridge'&&i.language==='en');
      expect(styled.action).toBe('render');
      expect(styled.contentHash).not.toBe(manifest.lessons['uhc-primary-care'].sections.bridge.en.content_hash);
    } finally {PRIMARY_CARE_STORY_STYLES.en=oldStyle;}
  });

  it('integrates the original lesson illustration into the viewer and animation',()=>{
    const art=source.assets.find(a=>a.id==='primary-care-next-step');
    expect(fileHash(art.path)).toBe(art.content_hash);
    expect(sha(readFileSync(path.join(root,'remotion/public/uhc-primary-care/scene.png')))).toBe(art.content_hash);
    expect(art.provenance).toMatch(/2026-10-03.*Vlanche.*Ernesto/);
    expect(['draft','approved']).toContain(art.review_status);
    const viewer=readFileSync(path.join(root,'src/components/elearning/reference-lessons.tsx'),'utf8');
    const primary=viewer.split('lesson?.lesson_key === "uhc-primary-care"')[1].split(': null;')[0];
    expect(primary).toContain(art.path);
    for(const section of source.sections) expect(section.asset_ids).toContain(art.id);
  });

  it('has both featured videos and captions aligned with the measured Gemini scripts',()=>{
    const asset=source.assets.find(a=>a.id===source.featured_asset_id);
    expect(asset.provenance).toMatch(/Gemini TTS.*gemini-3\.8-flash-tts.*Kore/);
    expect(fileHash(asset.path)).toBe(asset.content_hash);
    for(const lang of ['fil','en']) {
      const video=asset.videos[lang];
      expect(fileHash(video.path)).toBe(video.content_hash);
      expect(fileHash(video.captions.path)).toBe(video.captions.content_hash);
      const timings=json(path.join(root,`remotion/public/uhc-primary-care/narration-${lang}.json`));
      expect(timings).toMatchObject({language:lang,provider:'gemini',model:'gemini-3.8-flash-tts',voice:'Kore'});
      expect(timings.beats.map(b=>b.zone)).toEqual(PRIMARY_CARE_BEATS.map(b=>b.id));
      expect(timings.beats.map(b=>b.text)).toEqual(PRIMARY_CARE_BEATS.map(b=>b[lang]));
      expect(bytes(video.captions.path).toString('utf8').replaceAll('\r','')).toBe(toWebVtt(timings));
      expect(video.duration_s).toBeGreaterThan(timings.durationSeconds);
      expect(video.duration_s).toBeLessThanOrEqual(90);
    }
  });
});

