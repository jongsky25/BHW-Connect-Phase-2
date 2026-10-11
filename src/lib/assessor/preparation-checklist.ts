/** Navigation guidance from personal, current server records. Never an award or permission check. */
export type PreparationStep = 'briefing'|'pretest'|'study'|'posttest'|'orientation'|'simulation'|'certification';
export type ChecklistStatus = 'recorded'|'remaining'|'unavailable'|'unknown';
export type PreparationQualification = {
  status:'active'|'suspended'|'revoked'|'in_progress'|'unavailable';
  next_step:string;
};
export function preparationQualification(value:unknown, curriculumVersion:string):PreparationQualification|null {
  if(!value || typeof value!=='object')return null;
  const row=value as Record<string,unknown>;
  const allowed:Record<string,string[]>={active:['qualified'],suspended:['contact_admin'],revoked:['contact_admin'],
    unavailable:['await_chapter_requirements'],in_progress:['pretest','study','posttest','orientation_lessons','scoring_exercise','issue']};
  if(typeof row.status!=='string'||typeof row.next_step!=='string'||!allowed[row.status]?.includes(row.next_step))return null;
  if(row.status!=='unavailable' && row.curriculum_version!==curriculumVersion)return null;
  return {status:row.status as PreparationQualification['status'],next_step:row.next_step};
}
export type PreparationChecklistInput = {
  briefingRecorded:boolean;pretestRecorded:boolean;total:number;completed:number;missing:number;
  nextLessonHref:string|null;examAvailable:boolean;passingPercent:number;
  attempts:Array<{phase:string;status:string;score_percent:number|null;passed:boolean|null}>;
  qualification:PreparationQualification|null;
};
export function preparationChecklist(input:PreparationChecklistInput) {
  const studyDone=input.total>0 && input.missing===0 && input.completed===input.total;
  // The server pass and the authored threshold must agree. A failed retry never erases an earlier pass.
  const posttestPassed=input.attempts.some(a=>a.phase==='posttest'&&a.status==='submitted'&&a.passed===true
    && typeof a.score_percent==='number'&&Number.isFinite(a.score_percent)&&a.score_percent>=input.passingPercent&&a.score_percent<=100);
  const ready=input.pretestRecorded&&studyDone&&posttestPassed;
  const q=input.qualification;
  const orientationDone=!!q && (['active','suspended','revoked'].includes(q.status)||q.next_step==='issue');
  const steps:Array<{id:PreparationStep;status:ChecklistStatus}>=[
    {id:'briefing',status:input.briefingRecorded?'recorded':'remaining'},
    {id:'pretest',status:input.pretestRecorded?'recorded':input.examAvailable?'remaining':'unavailable'},
    {id:'study',status:studyDone?'recorded':input.missing>0?'unavailable':'remaining'},
    {id:'posttest',status:posttestPassed?'recorded':input.examAvailable?'remaining':'unavailable'},
    {id:'orientation',status:!q?'unknown':orientationDone?'recorded':q.status==='unavailable'?'unavailable':'remaining'},
    {id:'simulation',status:'unavailable'},
    {id:'certification',status:'unavailable'},
  ];
  let next:'briefing'|'pretest'|'study'|'publication'|'posttest'|'orientation'|'scoring'|'simulation_pending'|'qualification'|'status_retry'|'requirements';
  if(!input.briefingRecorded)next='briefing';
  else if(q && ['active','suspended','revoked'].includes(q.status))next='qualification';
  else if(!input.pretestRecorded)next=input.examAvailable?'pretest':'requirements';
  else if(!studyDone)next=input.nextLessonHref&&input.completed<input.total?'study':'publication';
  else if(!posttestPassed)next=input.examAvailable?'posttest':'requirements';
  else if(!q)next='status_retry';
  else if(q.status==='unavailable')next='requirements';
  else if(ready&&orientationDone)next='simulation_pending';
  else if(q.next_step==='scoring_exercise')next='scoring';
  else if(q.next_step==='orientation_lessons')next='orientation';
  else next='status_retry'; // Conflicting live records need a refresh, not optimistic advancement.
  return {steps,next,qualificationStatus:q?.status??null};
}
