export type FormalCriterion={id:string;version:string;fil:string;en:string;
  rubric:{observable:{fil:string;en:string};levels:Record<'kaya_na'|'kailangan_practice'|'hindi_pa',{fil:string;en:string}>}};
export type FormalEvidence={id:string;sufficiency:'not_observed'|'insufficient'|'sufficient';
  rating:'kaya_na'|'kailangan_practice'|'hindi_pa'|null;facts:string;nextStep:string};
export type FormalAttempt={id:string;status:'draft'|'submitted';revision:number;
  criteria:FormalCriterion[];evidence:FormalEvidence[];
  outcome:'complete'|'needs_practice'|'insufficient_evidence'|null;
  startedAt:string;submittedAt:string|null};
export type FormalState={requestId:string;programId:string;moduleId:string;learnerName:string;
  moduleTitleFil:string;moduleTitleEn:string;purposeFil:string;purposeEn:string;
  canStart:boolean;attempt:FormalAttempt|null};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const str=(value:unknown):value is string=>typeof value==='string';
export function parseFormalState(value:unknown):FormalState|null{
  if(!object(value)||!str(value.requestId)||!str(value.programId)||!str(value.moduleId)||!str(value.learnerName)
    ||!str(value.moduleTitleFil)||!str(value.moduleTitleEn)||!str(value.purposeFil)
    ||!str(value.purposeEn)||typeof value.canStart!=='boolean')return null;
  const a=value.attempt;
  if(a!==null){
    if(!object(a)||!str(a.id)||!['draft','submitted'].includes(String(a.status))
      ||!Number.isInteger(a.revision)||!Array.isArray(a.criteria)||a.criteria.length<1||a.criteria.length>50
      ||!a.criteria.every((c:unknown)=>{
        if(!object(c)||!str(c.id)||!str(c.version)||!str(c.fil)||!str(c.en)||!object(c.rubric))return false;
        const rubric=c.rubric;
        if(!object(rubric.observable)||!str(rubric.observable.fil)||!str(rubric.observable.en)
          ||!object(rubric.levels))return false;
        const levels=rubric.levels;
        return ['kaya_na','kailangan_practice','hindi_pa'].every(level=>{
          const anchor=levels[level];return object(anchor)&&str(anchor.fil)&&str(anchor.en);
        });
      })
      ||!Array.isArray(a.evidence)||a.evidence.length>50
      ||!a.evidence.every((e:unknown)=>object(e)&&str(e.id)
        &&['not_observed','insufficient','sufficient'].includes(String(e.sufficiency))
        &&(e.rating===null||['kaya_na','kailangan_practice','hindi_pa'].includes(String(e.rating)))
        &&str(e.facts)&&str(e.nextStep))
      ||!str(a.startedAt)||!(a.submittedAt===null||str(a.submittedAt))
      ||!(a.outcome===null||['complete','needs_practice','insufficient_evidence'].includes(String(a.outcome))))return null;
  }
  return value as FormalState;
}
