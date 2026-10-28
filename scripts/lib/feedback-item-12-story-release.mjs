import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {contentHash,validateReferenceLesson} from './reference-content.mjs';

const release=JSON.parse(readFileSync('src/lib/elearning/feedback-item-12-story-release.json'));
const sha=path=>createHash('sha256').update(readFileSync('public'+path)).digest('hex');

// Keep the owner-approved source package unchanged; the published successor
// changes only the two selected story videos and their captions/posters.
export function applyFeedbackItem12StoryRelease(lesson){
  if(lesson.manifest.lesson_key!==release.lesson_key)return lesson;
  if(contentHash(lesson)!==release.base_content_hash)throw new Error('Item 12 lesson baseline drift');
  const next=structuredClone(lesson);
  const matches=next.revision.assets.filter(asset=>asset.id===release.asset_id);
  if(matches.length!==1||contentHash(matches[0])!==release.base_asset_hash)throw new Error('Item 12 story baseline drift');
  for(const language of ['fil','en']){
    const video=release.videos[language];
    for(const media of [video,video.captions,video.poster])if(sha(media.path)!==media.content_hash)throw new Error('Item 12 media hash drift: '+media.path);
    matches[0].videos[language]=video;
  }
  matches[0].path=release.videos.fil.poster.path;
  matches[0].content_hash=release.videos.fil.poster.content_hash;
  validateReferenceLesson(next);
  if(contentHash(next)!==release.new_content_hash)throw new Error('Item 12 successor hash drift');
  return next;
}
