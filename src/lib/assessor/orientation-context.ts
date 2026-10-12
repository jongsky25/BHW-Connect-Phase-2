import 'server-only';
import manifest from '../../../content/assessor/bhw-reference-manual.v1.json';
import orientation from '../../../content/assessor/chapter-1-orientation.v1.json';
import roles from '../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/competency.json';
import communication from '../../../content/training/day1-basic-competencies/modules/06-komunikasyon/competency.json';
import problems from '../../../content/training/day1-basic-competencies/modules/07-problema/competency.json';
import safety from '../../../content/training/day1-basic-competencies/modules/08-osh/competency.json';
import type {OrientationState, OrientationCriterion} from '@/components/elearning/assessor-orientation';

const rubrics: Record<string, typeof roles> = {
  '01-tungkulin-ng-bhw': roles, '06-komunikasyon': communication,
  '07-problema': problems, '08-osh': safety,
};

/** Display the existing AF-04 calibration sources, never the draft C1AF mapping.
 * Keep answer keys on the server and return only the applicable public anchors.
 * Source hashes remain pinned by assessor:check; this does not approve new awards.
 */
export function chapter1OrientationContext(state: OrientationState): Record<string, OrientationCriterion> | null {
  if (state.orientation_version !== orientation.orientation_version
    || state.passing_count !== orientation.passing_count
    || state.cases?.length !== orientation.cases.length) return null;
  const result: Record<string, OrientationCriterion> = {};
  for (const [index, item] of state.cases.entries()) {
    const source = orientation.cases[index];
    if (item.id !== source.id || item.indicator !== source.indicator
      || Boolean(item.critical) !== Boolean('critical' in source && source.critical)
      || item.case.en !== source.case.en || item.case.fil !== source.case.fil) return null;
    const subchapter = manifest.chapters[0].modules.find(m => m.indicators.some(i => i.id === item.indicator));
    const indicator = subchapter?.indicators.find(i => i.id === item.indicator);
    const rubric = subchapter && rubrics[subchapter.module_key]?.observation_indicators.find(i => i.objective_index === indicator?.source_objective_index);
    if (!subchapter || !rubric) return null;
    result[item.id] = {
      title: subchapter.title,
      observable: {fil: rubric.observable_fil, en: rubric.observable_en},
      anchors: {
        kaya_na: {fil: rubric.levels.kaya_na_fil, en: rubric.levels.kaya_na_en},
        kailangan_practice: {fil: rubric.levels.kailangan_practice_fil, en: rubric.levels.kailangan_practice_en},
        hindi_pa: {fil: rubric.levels.hindi_pa_fil, en: rubric.levels.hindi_pa_en},
      },
    };
  }
  return result;
}
