import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');

// Exclude only new, hash-pinned successor files from older no-change audits.
// Their preceding public videos, captions, narration and scripts remain audited.
export function feedbackItem12MediaExclusions(){
  const release=JSON.parse(readFileSync('src/lib/elearning/feedback-item-12-story-release.json'));
  const paths=[];
  for(const language of ['fil','en']){
    const video=release.videos[language];
    for(const media of [video,video.captions,video.poster]){
      const path='public'+media.path;
      assert.equal(sha(path),media.content_hash,'Item 12 media hash drift: '+path);
      paths.push(path);
    }
    const prefix=`remotion/public/communication-explain/narration-context-${language}`;
    const timing=JSON.parse(readFileSync(prefix+'.json'));
    assert.equal(timing.language,language);
    assert.equal(sha(prefix+'.mp3'),timing.audio_sha256);
    paths.push(prefix+'.json',prefix+'.mp3');
  }
  const source='remotion/src/communication-explain/narration-context.ts';
  assert.equal(sha(source),'634fb9c3c50c8f4f443c33de1f90824e76d494bfdbbaaef570d5d2c913eeddab');
  paths.push(source);
  return paths.map(path=>':(exclude)'+path);
}
