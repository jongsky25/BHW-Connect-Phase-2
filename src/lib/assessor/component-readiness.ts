export const COMPONENT_BLOCKERS = [
  'component_contract_unavailable','component_mapping_incomplete',
  'required_content_unavailable','stale_learning_evidence','required_lessons_incomplete',
  'approved_rubric_unavailable','test_release_unavailable','required_tests_incomplete',
  'chapter_award_required','rollout_writes_closed','assigned_to_other',
] as const;
export type ComponentBlocker=typeof COMPONENT_BLOCKERS[number];
export type ComponentReadiness={moduleId:string;titleFil:string;titleEn:string;
  learnerReady:boolean;actorAuthorized:boolean;canArrange:boolean;
  learnerBlockers:ComponentBlocker[];authorityBlockers:ComponentBlocker[];
  missingLessonIds:string[];staleLessonIds:string[];missingTestPhases:string[]};

const object=(value:unknown):value is Record<string,unknown>=>
  !!value&&typeof value==='object'&&!Array.isArray(value);
const strings=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(item=>typeof item==='string');
const blockers=(value:unknown):value is ComponentBlocker[]=>
  strings(value)&&value.every(item=>COMPONENT_BLOCKERS.includes(item as ComponentBlocker));
export function parseComponentReadiness(value:unknown):ComponentReadiness[]|null{
  if(!Array.isArray(value)||value.length>20)return null;
  if(!value.every(row=>object(row)&&typeof row.moduleId==='string'
    &&typeof row.titleFil==='string'&&typeof row.titleEn==='string'
    &&typeof row.learnerReady==='boolean'&&typeof row.actorAuthorized==='boolean'
    &&typeof row.canArrange==='boolean'&&blockers(row.learnerBlockers)
    &&blockers(row.authorityBlockers)&&strings(row.missingLessonIds)
    &&strings(row.staleLessonIds)&&strings(row.missingTestPhases)
    &&row.canArrange===(row.learnerReady&&row.actorAuthorized)))return null;
  return value as ComponentReadiness[];
}

const descriptions:Record<ComponentBlocker,{fil:string;en:string}>={
  component_contract_unavailable:{fil:'Wala pang aprubadong tuntunin para sa bahaging ito.',en:'This component has no approved requirements yet.'},
  component_mapping_incomplete:{fil:'Hindi pa kumpleto ang mapa ng aralin at pamantayan.',en:'The lesson and criterion mapping is incomplete.'},
  required_content_unavailable:{fil:'May kinakailangang aralin na hindi pa nailalathala.',en:'A required lesson is not published.'},
  stale_learning_evidence:{fil:'May natapos na aralin sa lumang bersyon; balikan ang kasalukuyang aralin.',en:'A completed lesson uses an older revision; revisit the current lesson.'},
  required_lessons_incomplete:{fil:'May kinakailangang aralin na hindi pa natatapos.',en:'Required lessons remain incomplete.'},
  approved_rubric_unavailable:{fil:'Wala pang aprubadong rubric para sa bahaging ito.',en:'An approved rubric is not available for this component.'},
  test_release_unavailable:{fil:'Hindi available ang aprubadong test para sa kinakailangang yugto.',en:'The approved test release is unavailable for a required phase.'},
  required_tests_incomplete:{fil:'May kinakailangang test na hindi pa naitatala.',en:'A required test has not been recorded.'},
  chapter_award_required:{fil:'Kailangan ang aktibong Chapter 1 assessor award.',en:'An active Chapter 1 assessor award is required.'},
  rollout_writes_closed:{fil:'Hindi pa bukas ang opisyal na gawaing pagtatasa para sa cohort na ito.',en:'Official assessment work is not open for this cohort.'},
  assigned_to_other:{fil:'May ibang assessor na nakatalaga sa bahaging ito.',en:'Another assessor is assigned to this component.'},
};
export function componentBlockerLabel(blocker:ComponentBlocker,lang:'fil'|'en'){
  return descriptions[blocker][lang];
}
