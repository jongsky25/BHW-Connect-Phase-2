export type PracticeStaff={id:string;name:string};
export type PracticeFollowup={id:string;sourceAttemptId:string;learnerId:string;learnerName:string;
  lessonId:string;criterionId:string;action:'practice'|'observation';assignedTo:string;
  assignedName:string;agreedAt:string|null;status:'open'|'completed'|'cancelled';
  retryAttemptId:string|null;completionNote:string|null;createdAt:string;updatedAt:string};
export type PracticeFollowupState={staff:PracticeStaff[];followups:PracticeFollowup[]};
export type ReleasedPracticeFeedback={id:string;lessonId:string;criterionId:string;feedback:string;
  nextStep:string;releasedAt:string;sufficiency:string;followup:{action:'practice'|'observation';
    assignedName:string;agreedAt:string|null;status:'open'|'completed'|'cancelled';completedAt:string|null}|null};

const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const str=(value:unknown):value is string=>typeof value==='string';
const nullable=(value:unknown)=>value===null||str(value);
const state=(value:unknown)=>value==='open'||value==='completed'||value==='cancelled';
const action=(value:unknown)=>value==='practice'||value==='observation';

export function parsePracticeFollowupState(value:unknown):PracticeFollowupState|null{
  if(!object(value)||!Array.isArray(value.staff)||!Array.isArray(value.followups)
    ||value.staff.length>100||value.followups.length>50)return null;
  if(!value.staff.every(item=>object(item)&&str(item.id)&&str(item.name)))return null;
  if(!value.followups.every(item=>object(item)&&['id','sourceAttemptId','learnerId','learnerName',
    'lessonId','criterionId','assignedTo','assignedName','createdAt','updatedAt'].every(k=>str(item[k]))
    &&action(item.action)&&state(item.status)&&nullable(item.agreedAt)
    &&nullable(item.retryAttemptId)&&nullable(item.completionNote)))return null;
  return value as PracticeFollowupState;
}

export function parseReleasedPracticeFeedback(value:unknown):ReleasedPracticeFeedback[]|null{
  if(!Array.isArray(value)||value.length>20)return null;
  if(!value.every(item=>object(item)&&['id','lessonId','criterionId','feedback','nextStep',
    'releasedAt','sufficiency'].every(k=>str(item[k]))
    &&(item.followup===null||(object(item.followup)&&action(item.followup.action)
      &&state(item.followup.status)&&str(item.followup.assignedName)
      &&nullable(item.followup.agreedAt)&&nullable(item.followup.completedAt)))))return null;
  return value as ReleasedPracticeFeedback[];
}

export function followupDueLabel(plan:PracticeFollowup,now=Date.now()){
  if(plan.status!=='open'||!plan.agreedAt)return 'none';
  return Date.parse(plan.agreedAt)<now?'overdue':'scheduled';
}
