import {type FormalCriterion,type FormalEvidence} from './formal-attempt';

export type ChapterReviewComponent={moduleId:string;titleFil:string;titleEn:string;
  learnerReady:boolean;learnerBlockers:string[];contractCurrent:boolean;
  attemptId:string|null;attemptStatus:'draft'|'submitted'|null;
  outcome:'complete'|'needs_practice'|'insufficient_evidence'|null;
  ownedByMe:boolean;retryOpened:boolean;feedbackReleased:boolean;
  reassessment:{priorAttemptId:string;practiceNote:string;practiceAttemptId:string|null}|null;
  criteria:FormalCriterion[]|null;evidence:FormalEvidence[]|null};
export type ChapterReviewState={programId:string;chapterId:string;courseId:string;
  learnerId:string;learnerName:string;requirementsVersion:string;
  components:ChapterReviewComponent[];suggestedOutcome:'complete'|'needs_practice'|'insufficient_evidence';
  canDecide:boolean;latestReview:{id:string;outcome:string;summaryFil:string;
    summaryEn:string;decidedAt:string;certificateId:string|null}|null};
export type BhwFormalResults={attempts:Array<{id:string;moduleTitleFil:string;moduleTitleEn:string;
  outcome:string;feedbackFil:string;feedbackEn:string;criteria:FormalCriterion[];
  evidence:FormalEvidence[];releasedAt:string}>;
  reviews:Array<{id:string;outcome:string;summaryFil:string;summaryEn:string;
    decidedAt:string;verificationCode:string|null}>};
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const str=(v:unknown):v is string=>typeof v==='string';
const maybe=(v:unknown)=>v===null||str(v);
const outcome=(v:unknown)=>['complete','needs_practice','insufficient_evidence'].includes(String(v));
const criteria=(v:unknown)=>Array.isArray(v)&&v.length<=100&&v.every(c=>obj(c)&&str(c.id)&&str(c.fil)&&str(c.en));
const evidence=(v:unknown)=>Array.isArray(v)&&v.length<=100&&v.every(e=>obj(e)&&str(e.id)
  &&str(e.sufficiency)&&maybe(e.rating)&&str(e.facts)&&str(e.nextStep));
export function parseChapterReviewState(v:unknown):ChapterReviewState|null{
  if(!obj(v)||!str(v.programId)||!str(v.chapterId)||!str(v.courseId)
    ||!str(v.learnerId)||!str(v.learnerName)||!str(v.requirementsVersion)
    ||!outcome(v.suggestedOutcome)||typeof v.canDecide!=='boolean'
    ||!Array.isArray(v.components)||v.components.length>20
    ||!v.components.every(c=>obj(c)&&str(c.moduleId)&&str(c.titleFil)&&str(c.titleEn)
      &&typeof c.learnerReady==='boolean'&&Array.isArray(c.learnerBlockers)
      &&c.learnerBlockers.every(str)&&typeof c.contractCurrent==='boolean'
      &&maybe(c.attemptId)&&(c.attemptStatus===null||['draft','submitted'].includes(String(c.attemptStatus)))
      &&(c.outcome===null||outcome(c.outcome))&&typeof c.ownedByMe==='boolean'
      &&typeof c.retryOpened==='boolean'&&typeof c.feedbackReleased==='boolean'
      &&(c.reassessment===null||(obj(c.reassessment)
        &&str(c.reassessment.priorAttemptId)&&str(c.reassessment.practiceNote)
        &&maybe(c.reassessment.practiceAttemptId)))
      &&(c.criteria===null||criteria(c.criteria))&&(c.evidence===null||evidence(c.evidence))))return null;
  const latest=v.latestReview;
  if(latest!==null&&(!obj(latest)||!str(latest.id)||!outcome(latest.outcome)
    ||!str(latest.summaryFil)||!str(latest.summaryEn)||!str(latest.decidedAt)
    ||!maybe(latest.certificateId)))return null;
  return v as ChapterReviewState;
}
export function parseBhwFormalResults(v:unknown):BhwFormalResults|null{
  if(!obj(v)||!Array.isArray(v.attempts)||v.attempts.length>20
    ||!v.attempts.every(a=>obj(a)&&str(a.id)&&str(a.moduleTitleFil)&&str(a.moduleTitleEn)
      &&outcome(a.outcome)&&str(a.feedbackFil)&&str(a.feedbackEn)
      &&criteria(a.criteria)&&evidence(a.evidence)&&str(a.releasedAt))
    ||!Array.isArray(v.reviews)||v.reviews.length>10
    ||!v.reviews.every(r=>obj(r)&&str(r.id)&&outcome(r.outcome)
      &&str(r.summaryFil)&&str(r.summaryEn)&&str(r.decidedAt)&&maybe(r.verificationCode)))return null;
  return v as BhwFormalResults;
}
