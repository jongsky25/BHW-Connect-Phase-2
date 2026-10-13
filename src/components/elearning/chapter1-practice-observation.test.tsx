import {cleanup,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {Chapter1PracticeObservation} from './chapter1-practice-observation';
import type {LessonPracticeContext} from '@/lib/assessor/lesson-observation';

const state=vi.hoisted(()=>({rpc:vi.fn(),refresh:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:state.refresh})}));
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc:state.rpc})}));
const context:LessonPracticeContext={programId:'11111111-1111-4111-8111-111111111111',
  chapterId:'22222222-2222-4222-8222-222222222222',moduleId:'33333333-3333-4333-8333-333333333333',
  lessonId:'44444444-4444-4444-8444-444444444444',learner:{id:'55555555-5555-4555-8555-555555555555',name:'Ada',barangay:'North'},
  canRecord:true,criteria:[{id:'clarify',version:'v1',requirementsVersion:'req1',rubricVersion:'rubric1',recordable:true,
    rubric:{observable:{fil:'Linawin ang sinabi',en:'Clarify the statement'},levels:{
      kaya_na:{fil:'Kaya nang maglinaw',en:'Clarifies independently'},
      kailangan_practice:{fil:'Kailangan pa ng ensayo',en:'Needs more practice'},
      hindi_pa:{fil:'Hindi pa naipakita',en:'Not yet demonstrated'},
    }}}]};
const props={context,lang:'en' as const,backHref:'/training/back',history:[],legacy:[]};
afterEach(()=>{cleanup();vi.clearAllMocks();});

describe('C1AF-14 observation form',()=>{
  it('keeps rating absent until sufficient evidence and makes unsampled attempts ungraded',async()=>{
    const user=userEvent.setup();render(<Chapter1PracticeObservation {...props}/>);
    expect(screen.queryByRole('radio',{name:'Clarifies independently'})).toBeNull();
    await user.click(screen.getByRole('radio',{name:'Not observed'}));
    await user.type(screen.getByRole('textbox',{name:'Why it was not observed'}),'The practice ended before Ada took a turn.');
    await user.type(screen.getByRole('textbox',{name:'Next step'}),'Observe Ada in the next round.');
    state.rpc.mockResolvedValue({data:'66666666-6666-4666-8666-666666666666',error:null});
    await user.click(screen.getByRole('button',{name:'Save observation'}));
    await waitFor(()=>expect(state.rpc).toHaveBeenCalledOnce());
    expect(state.rpc.mock.calls[0][1]).toMatchObject({p_sufficiency:'not_observed',p_rating:null,p_bhw_user_id:context.learner!.id});
    expect(await screen.findByText(/Observation saved/)).toBeInTheDocument();
  });
  it('retains entered text after a failed prompted save and protects navigation',async()=>{
    const user=userEvent.setup();render(<Chapter1PracticeObservation {...props}/>);
    await user.click(screen.getByRole('radio',{name:'Sufficient direct evidence'}));
    await user.type(screen.getByRole('textbox',{name:'Exact actions and words observed'}),'Ada repeated the corrected concern and asked if she understood.');
    await user.click(screen.getByRole('radio',{name:'Prompted'}));
    await user.type(screen.getByRole('textbox',{name:'What prompt was given?'}),'Ask one more detail.');
    await user.click(screen.getByRole('radio',{name:'Clarifies independently'}));
    await user.type(screen.getByRole('textbox',{name:'Next step'}),'Practice again.');
    state.rpc.mockResolvedValue({data:null,error:{message:'offline'}});
    await user.click(screen.getByRole('button',{name:'Save observation'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your text is still here');
    expect(screen.getByRole('textbox',{name:'Exact actions and words observed'})).toHaveValue('Ada repeated the corrected concern and asked if she understood.');
    expect(state.rpc.mock.calls[0][1]).toMatchObject({p_rating:'kaya_na',p_prompts:'Ask one more detail.'});
    const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
    await user.click(screen.getByRole('link',{name:'Back to lesson'}));
    expect(confirm).toHaveBeenCalled();
    confirm.mockRestore();
  });
  it('shows reviewed anchors in Filipino while writes remain closed',()=>{
    render(<Chapter1PracticeObservation {...props} lang="fil" context={{...context,canRecord:false}}/>);
    expect(screen.getByText('Linawin ang sinabi')).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Itala ang obserbasyon'})).toBeNull();
  });
});
