import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {AssessorOrientation,type OrientationState,type OrientationCriterion} from './assessor-orientation';

const rpc=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc})}));
afterEach(()=>{cleanup();rpc.mockReset();});
const local=(en:string,fil=en)=>({en,fil});
const state:OrientationState={orientation_version:'test-v1',ready:true,passed:false,title:local('Scoring orientation'),guide:[local('Observe first.')],passing_count:4,
  lessons:[{id:'evidence',title:local('Record evidence'),body:[local('Write what was observed.')]}],completed_lessons:['evidence'],
  cases:Array.from({length:5},(_,i)=>({id:`case-${i+1}`,indicator:`indicator-${i+1}`,case:local(`Observation ${i+1}`)}))};
const props={chapterId:'chapter-1-id',chapterHref:'/training/manual/assessor/chapter-1',locale:'en'};

describe('assessor orientation',()=>{
  it('shows Chapter II and requires every safety case',()=>{
    render(<AssessorOrientation {...props} chapterLabel={{fil:'Kabanata II',en:'Chapter II'}} initial={{...state,passed:true,
      cases:state.cases!.map((item,index)=>({...item,critical:index<2}))}}/>);
    expect(screen.getByText('Chapter II · Assessor orientation')).toBeInTheDocument();
    expect(screen.getByText(/correct ratings on all 2 safety cases/)).toBeInTheDocument();
    expect(screen.getByText(/Your Chapter II pass is recorded/)).toBeInTheDocument();
  });
  it('keeps the exercise closed before prerequisites are met',()=>{
    render(<AssessorOrientation {...props} initial={{ready:false,passed:false}}/>);
    expect(screen.getByText(/Complete the diagnostic pretest/)).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Submit ratings'})).toBeNull();
  });
  it('requires all ratings and guide acknowledgement before submitting',async()=>{
    rpc.mockResolvedValue({data:{correct_count:5,question_count:5,passed:true,critical_correct:true,feedback:[]},error:null});
    render(<AssessorOrientation {...props} initial={state}/>);
    fireEvent.click(screen.getByRole('button',{name:'Submit ratings'}));
    expect(screen.getByRole('alert')).toHaveTextContent('Read the guide and score every case.');
    expect(rpc).not.toHaveBeenCalled();
    for(const fieldset of screen.getAllByRole('group',{name:/Case \d/}))fireEvent.click(fieldset.querySelector('input[value="kaya_na"]')!);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button',{name:'Submit ratings'}));
    await waitFor(()=>expect(rpc).toHaveBeenCalledWith('rpc_assessor_orientation_submit',{
      p_chapter_id:'chapter-1-id',p_acknowledged:true,p_answers:state.cases!.map(c=>({id:c.id,rating:'kaya_na'})),
    }));
    expect(await screen.findByText('Orientation completed')).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'View my qualifications'})).toHaveAttribute('href','/training/manual/assessor/qualifications');
  });
  it('records each lesson before opening scoring practice',async()=>{
    rpc.mockResolvedValue({data:null,error:null});
    render(<AssessorOrientation {...props} initial={{...state,completed_lessons:[]}}/>);
    expect(screen.queryByRole('button',{name:'Submit ratings'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Mark lesson complete'}));
    await waitFor(()=>expect(rpc).toHaveBeenCalledWith('rpc_assessor_orientation_lesson_complete',{
      p_chapter_id:'chapter-1-id',p_lesson_id:'evidence',
    }));
    expect(await screen.findByRole('button',{name:'Submit ratings'})).toBeInTheDocument();
  });
});

const context:Record<string,OrientationCriterion>=Object.fromEntries(state.cases!.map(item=>[item.id,{
  title:local('Listening','Pakikinig'),observable:local('Ask permission and listen.','Humingi ng pahintulot at makinig.'),
  anchors:{kaya_na:local('Independent listening.'),kailangan_practice:local('Listening after a prompt.'),hindi_pa:local('Concern not gathered.')},
}]));
const score=()=>{
  for(const fieldset of screen.getAllByRole('group',{name:/Case \d/}))fireEvent.click(fieldset.querySelector('input[value="kaya_na"]')!);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button',{name:'Submit ratings'}));
};
describe('C1AF-06 context and recovery',()=>{
  it.each(['en','fil'])('shows the criterion and all anchors beside every case in %s',locale=>{
    render(<AssessorOrientation {...props} locale={locale} initial={state} chapter1Context={context}/>);
    for(const group of screen.getAllByRole('group',{name:locale==='en'?/Case \d/:/Kaso \d/})){
      expect(within(group).getByText(locale==='en'?'Listening':'Pakikinig')).toBeInTheDocument();
      expect(within(group).getByRole('heading',{name:locale==='en'?'Ask permission and listen.':'Humingi ng pahintulot at makinig.'})).toBeInTheDocument();
      for(const label of ['Independent listening.','Listening after a prompt.','Concern not gathered.'])expect(within(group).getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText('indicator-1')).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('resumes the first unfinished lesson after reload and skips already completed later lessons',async()=>{
    const lessons=['one','two','three','four'].map(id=>({id,title:local(id),body:[local('Read this.')]}));
    const initial={...state,lessons,completed_lessons:['one','three','obsolete']};
    const first=render(<AssessorOrientation {...props} initial={initial}/>);
    expect(screen.getByRole('heading',{name:'two'})).toBeInTheDocument();first.unmount();
    render(<AssessorOrientation {...props} initial={initial}/>);
    expect(screen.getByText('Lessons · 2 of 4')).toBeInTheDocument();
    rpc.mockResolvedValue({error:null});
    fireEvent.click(screen.getByRole('button',{name:'Mark lesson complete'}));
    expect(await screen.findByRole('heading',{name:'four'})).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledExactlyOnceWith('rpc_assessor_orientation_lesson_complete',{p_chapter_id:props.chapterId,p_lesson_id:'two'});
  });
  it('keeps a failed lesson available for retry and recovers an ambiguous save',async()=>{
    rpc.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({data:state,error:null});
    render(<AssessorOrientation {...props} initial={{...state,completed_lessons:[]}}/>);
    fireEvent.click(screen.getByRole('button',{name:'Mark lesson complete'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Lesson save could not be confirmed');
    expect(screen.getByRole('button',{name:'Mark lesson complete'})).toBeEnabled();
    fireEvent.click(screen.getByRole('button',{name:'Check saved progress'}));
    expect(await screen.findByRole('button',{name:'Submit ratings'})).toBeInTheDocument();
    expect(rpc).toHaveBeenLastCalledWith('rpc_assessor_orientation_state',{p_chapter_id:props.chapterId});
  });
  it('retains answers on submit failure, keeps unknown reads unknown, and recovers a saved pass without resubmission',async()=>{
    rpc.mockResolvedValueOnce({data:null,error:{message:'network'}})
      .mockResolvedValueOnce({data:{...state,orientation_version:'other-version',passed:true},error:null})
      .mockResolvedValueOnce({data:{...state,passed:true},error:null});
    render(<AssessorOrientation {...props} initial={state} chapter1Context={context}/>);
    score();expect(await screen.findByRole('alert')).toHaveTextContent('The result could not be confirmed');
    expect(screen.getAllByRole('radio',{checked:true})).toHaveLength(5);
    fireEvent.click(screen.getByRole('button',{name:'Check saved progress'}));
    await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Saved progress could not be confirmed'));
    expect(screen.queryByText('Orientation completed')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Check saved progress'}));
    expect(await screen.findByText('Orientation completed')).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Submit ratings'})).toBeNull();
    expect(rpc.mock.calls.map(call=>call[0])).toEqual(['rpc_assessor_orientation_submit','rpc_assessor_orientation_state','rpc_assessor_orientation_state']);
    expect(screen.getByText(/revised certification remains unavailable/)).toBeInTheDocument();
  });
  it('uses the server safety failure even with seven correct ratings and allows a corrected retry',async()=>{
    const initial={...state,passing_count:7,cases:Array.from({length:8},(_,i)=>({id:`s-${i}`,indicator:'safety',case:local(`Safety observation ${i}`),critical:i===7}))};
    rpc.mockResolvedValueOnce({data:{correct_count:7,question_count:8,passed:false,critical_correct:false,feedback:[{id:'s-7',correct:'hindi_pa',reason:local('Stop the unsafe task.')}]},error:null})
      .mockResolvedValueOnce({data:{correct_count:8,question_count:8,passed:true,critical_correct:true,feedback:[]},error:null});
    render(<AssessorOrientation {...props} initial={initial}/>);score();
    expect(await screen.findByText('Review the safety case decisions.')).toBeInTheDocument();
    expect(screen.queryByText('Orientation completed')).toBeNull();
    fireEvent.click(within(screen.getByRole('group',{name:'Case 8 · Safety'})).getByRole('radio',{name:'Hindi pa (not yet)'}));
    fireEvent.click(screen.getByRole('button',{name:'Submit ratings'}));
    expect(await screen.findByText('Orientation completed')).toBeInTheDocument();
    expect(rpc.mock.calls[1][1].p_answers[7]).toEqual({id:'s-7',rating:'hindi_pa'});
  });
  it.each([null,{}])('blocks scoring with unavailable or incomplete context without resetting recorded passes (%j)',chapter1Context=>{
    const first=render(<AssessorOrientation {...props} initial={state} chapter1Context={chapter1Context}/>);
    expect(screen.getByText(/Matching criterion guidance is unavailable/)).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Submit ratings'})).toBeNull();first.unmount();
    render(<AssessorOrientation {...props} initial={{...state,passed:true}} chapter1Context={chapter1Context}/>);
    expect(screen.getByText('Orientation completed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'1. Record evidence · Completed'}));
    expect(screen.getByText('Orientation completed')).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('explains missing evidence without writing or transferring a practice record',()=>{
    const setItem=vi.spyOn(Storage.prototype,'setItem');
    const first=render(<AssessorOrientation {...props} initial={state} chapter1Context={context}/>);
    fireEvent.click(screen.getByRole('button',{name:'Insufficient evidence'}));
    expect(screen.getByText(/Not yet observed — no rating/)).toBeInTheDocument();
    expect(screen.getByText(/Practice stays separate from formal evidence/)).toBeInTheDocument();
    expect(screen.getByText('SAMPLE only — not saved')).toBeInTheDocument();
    expect(screen.getByText(/Rosa does not care/)).toBeInTheDocument();
    first.unmount();render(<AssessorOrientation {...props} initial={state} chapter1Context={context}/>);
    expect(screen.getByRole('button',{name:'Observed performance'})).toHaveAttribute('aria-pressed','true');
    expect(rpc).not.toHaveBeenCalled();expect(setItem).not.toHaveBeenCalled();setItem.mockRestore();
  });
});
