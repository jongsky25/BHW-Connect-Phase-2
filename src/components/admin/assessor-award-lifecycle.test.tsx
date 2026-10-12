import {fireEvent,render,screen} from '@testing-library/react';
import {describe,expect,it,vi} from 'vitest';
import {AssessorAwardLifecycle,type AwardRow,type TransitionRow} from './assessor-award-lifecycle';

vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
const award:AwardRow={id:'award',certificateId:'certificate',actorId:'actor',name:'Fictional Alex',
  programId:'program',chapterId:'chapter',status:'suspended',issuedAt:'2026-10-12T00:00:00Z',statusChangedAt:null,
  history:[{id:'event',operatorId:'admin',previousStatus:'active',nextStatus:'suspended',reason:'Fictional reviewed reason',at:'2026-10-12T00:00:00Z'}]};
const legacy:TransitionRow={legacyId:'legacy',actorId:'actor',name:'Fictional Alex',chapterKey:'chapter-1',programId:'program',
  status:'active',curriculumVersion:'v1',orientationVersion:'v1',requirementsVersion:'v2',
  category:'missing_evidence',blockers:['simulation_missing'],nextStep:'open_my_certifications',combinedAwardId:null};
describe('combined assessor lifecycle console',()=>{
  it('shows lifecycle history and a specific next step while mutation policy is off',()=>{
    render(<AssessorAwardLifecycle rows={[award]} report={[legacy]} mutationEnabled={false} awardPage={1} transitionPage={1} locale="en"/>);
    expect(screen.getByText(/Status changes are disabled/)).toBeVisible();
    expect(screen.queryByRole('button',{name:'Save'})).toBeNull();
    fireEvent.click(screen.getByText('Lifecycle history'));
    expect(screen.getByText(/Fictional reviewed reason/)).toBeVisible();
    expect(screen.getByText(/Open My certifications and complete missing steps/)).toBeVisible();
    expect(screen.getByText(/Simulation missing/)).toBeVisible();
  });
  it('shows only eligible suspended-award actions when the local policy gate is on',()=>{
    render(<AssessorAwardLifecycle rows={[award]} report={[]} mutationEnabled awardPage={1} transitionPage={1} locale="en"/>);
    expect(screen.getByRole('option',{name:'Restore'})).toBeVisible();
    expect(screen.getByRole('option',{name:'Revoke'})).toBeVisible();
    expect(screen.queryByRole('option',{name:'Suspend'})).toBeNull();
  });
});
