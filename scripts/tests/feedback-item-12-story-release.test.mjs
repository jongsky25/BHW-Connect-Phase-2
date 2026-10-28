// @vitest-environment node
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {loadReferenceModule,contentHash} from '../lib/reference-content.mjs';
import {applyApprovedReferenceReleases} from '../lib/safety-identify-copy-release.mjs';
import {COMMUNICATION_EXPLAIN_BEATS} from '../../remotion/src/communication-explain/narration-context.ts';

it('releases only a new six-beat story and keeps approved lesson text and old media intact',()=>{
  const release=JSON.parse(readFileSync('src/lib/elearning/feedback-item-12-story-release.json'));
  const source=loadReferenceModule('content/training/day1-basic-competencies/modules/06-komunikasyon','public');
  const prior=source.lessons.find(l=>l.manifest.lesson_key===release.lesson_key);
  const current=applyApprovedReferenceReleases(source).lessons.find(l=>l.manifest.lesson_key===release.lesson_key);
  expect(contentHash(prior)).toBe(release.base_content_hash);
  expect(contentHash(current)).toBe(release.new_content_hash);
  expect(current.manifest).toEqual(prior.manifest);
  expect(current.notes).toEqual(prior.notes);
  for(const key of ['read_sections','slides','coverage','sources','featured_asset_id'])expect(current.revision[key]).toEqual(prior.revision[key]);
  expect(current.revision.assets.filter(a=>a.id!==release.asset_id)).toEqual(prior.revision.assets.filter(a=>a.id!==release.asset_id));
  const oldAsset=prior.revision.assets.find(a=>a.id===release.asset_id);
  const newAsset=current.revision.assets.find(a=>a.id===release.asset_id);
  expect(contentHash(oldAsset)).toBe(release.base_asset_hash);
  for(const lang of ['fil','en']){
    const oldVideo=oldAsset.videos[lang],video=newAsset.videos[lang];
    expect(video.path).not.toBe(oldVideo.path);
    for(const media of [oldVideo,oldVideo.captions,oldVideo.poster,video,video.captions,video.poster])
      expect(createHash('sha256').update(readFileSync('public'+media.path)).digest('hex')).toBe(media.content_hash);
    const timing=JSON.parse(readFileSync(`remotion/public/communication-explain/narration-context-${lang}.json`));
    expect(timing.beats.map(b=>b.text)).toEqual(COMMUNICATION_EXPLAIN_BEATS.map(b=>b[lang]));
    expect(timing.durationSeconds).toBeLessThanOrEqual(88);
    const captions=readFileSync('public'+video.captions.path,'utf8');
    const paragraphs=captions.trim().split(/\n\s*\n/).slice(1).map(block=>block.split('\n').slice(2).join('\n').trim());
    expect(paragraphs).toEqual(timing.beats.map(b=>b.text));
    expect(paragraphs[1]).toMatch(/family planning/i);
    expect(paragraphs[2]).toMatch(lang==='en'?/felt low for weeks/i:/ilang linggo nang malungkot/i);
    expect(paragraphs[3]).toMatch(lang==='en'?/smoking; stress/i:/paninigarilyo; hadlang ang stress/i);
  }
});
