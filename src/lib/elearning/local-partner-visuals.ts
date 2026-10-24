import data from './local-partner-visuals.json';
import type {LessonAsset} from './types';

/** Only the exact reviewed asset identities receive a presentation replacement. */
export function localPartnerVisual(asset: LessonAsset, en: boolean) {
  if (!Object.hasOwn(data.visuals, asset.id) || asset.video || asset.videos) return null;
  const visual = data.visuals[asset.id as keyof typeof data.visuals];
  if (asset.path !== visual.path || asset.content_hash !== visual.content_hash || asset.review_status !== 'approved') return null;
  return {kind: visual.kind, section: visual.section_id, ...visual[en ? 'en' : 'fil']};
}
export function localPartnerScenePurpose(asset: LessonAsset, en: boolean) {
  const scene = data.scene;
  return asset.id === scene.id && asset.path === scene.path && asset.content_hash === scene.content_hash && asset.review_status === 'approved'
    ? scene[en ? 'en' : 'fil'] : null;
}
export type LocalPartnerVisual = NonNullable<ReturnType<typeof localPartnerVisual>>;
