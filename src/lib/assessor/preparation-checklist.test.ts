import {describe,it,expect} from 'vitest';
import {preparationChecklist,preparationQualification,type PreparationChecklistInput} from './preparation-checklist';
const input=(changes:Partial<PreparationChecklistInput>={}):PreparationChecklistInput=>({briefingRecorded:true,pretestRecorded:true,
  total:42,completed:42,missing:0,nextLessonHref:null,examAvailable:true,passingPercent:80,
  attempts:[{phase:'posttest',status:'submitted',score_percent:80,passed:true}],
  qualification:{status:'in_progress',next_step:'orientation_lessons'},...changes});
describe('personal preparation guidance',()=>{
  it('orders briefing, diagnostic and study without treating diagnostic score as a pass',()=>{
    expect(preparationChecklist(input({briefingRecorded:false})).next).toBe('briefing');
    expect(preparationChecklist(input({pretestRecorded:false})).next).toBe('pretest');
    expect(preparationChecklist(input({completed:12,nextLessonHref:'/saved-bookmark'})).next).toBe('study');
  });
  it.each([[79.9,true,'posttest'],[80,true,'orientation'],[80,false,'posttest'],[101,true,'posttest']])('requires server pass and threshold for %s', (score,passed,next)=>{
    expect(preparationChecklist(input({attempts:[{phase:'posttest',status:'submitted',score_percent:score as number,passed:passed as boolean}]})).next).toBe(next);
  });
  it('retains an earlier pass after a failed retry',()=>{
    expect(preparationChecklist(input({attempts:[...input().attempts,{phase:'posttest',status:'submitted',score_percent:70,passed:false}]})).next).toBe('orientation');
  });
  it('does not advance a partial publication or treat the last completed bookmark as unfinished work',()=>{
    const result=preparationChecklist(input({completed:41,missing:1}));
    expect(result.next).toBe('publication');expect(result.steps.find(s=>s.id==='study')?.status).toBe('unavailable');
    expect(preparationChecklist(input({completed:40,missing:1,nextLessonHref:'/unfinished'})).next).toBe('study');
  });
  it('distinguishes scoring from the unavailable simulation and revised certification',()=>{
    expect(preparationChecklist(input({qualification:{status:'in_progress',next_step:'scoring_exercise'}})).next).toBe('scoring');
    const result=preparationChecklist(input({qualification:{status:'in_progress',next_step:'issue'}}));
    expect(result.next).toBe('simulation_pending');expect(result.steps.slice(-2).every(s=>s.status==='unavailable')).toBe(true);
  });
  it.each(['active','suspended','revoked'] as const)('preserves the existing %s qualification without converting it',status=>{
    const result=preparationChecklist(input({completed:0,qualification:{status,next_step:status==='active'?'qualified':'contact_admin'}}));
    expect(result.next).toBe('qualification');expect(result.steps.at(-1)?.status).toBe('unavailable');
  });
  it('keeps unknown status honest while allowing known unfinished study',()=>{
    expect(preparationChecklist(input({qualification:null})).next).toBe('status_retry');
    expect(preparationChecklist(input({qualification:null,completed:3,nextLessonHref:'/resume'})).next).toBe('study');
  });
  it('rejects malformed, stale and conflicting qualification responses',()=>{
    expect(preparationQualification({status:'active',next_step:'qualified',curriculum_version:'old'},'current')).toBeNull();
    expect(preparationQualification({status:'active',next_step:'issue',curriculum_version:'current'},'current')).toBeNull();
    expect(preparationQualification(null,'current')).toBeNull();
    expect(preparationQualification({status:'in_progress',next_step:'scoring_exercise',curriculum_version:'current'},'current')).toEqual({status:'in_progress',next_step:'scoring_exercise'});
  });
});
