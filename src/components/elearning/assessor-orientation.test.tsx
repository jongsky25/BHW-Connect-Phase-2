import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {AssessorOrientation,type OrientationState} from './assessor-orientation';

const rpc=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc})}));
afterEach(()=>{cleanup();rpc.mockReset();});
const local=(en:string,fil=en)=>({en,fil});
const state:OrientationState={ready:true,passed:false,title:local('Scoring orientation'),guide:[local('Observe first.')],passing_count:4,
  lessons:[{id:'evidence',title:local('Record evidence'),body:[local('Write what was observed.')]}],completed_lessons:['evidence'],
  cases:Array.from({length:5},(_,i)=>({id:`case-${i+1}`,indicator:`indicator-${i+1}`,case:local(`Observation ${i+1}`)}))};
const props={chapterId:'chapter-1-id',chapterHref:'/training/manual/assessor/chapter-1',locale:'en'};

describe('assessor orientation',()=>{
  it('keeps the exercise closed before prerequisites are met',()=>{
    render(<AssessorOrientation {...props} initial={{ready:false,passed:false}}/>);
    expect(screen.getByText(/Complete the diagnostic pretest/)).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Submit ratings'})).toBeNull();
  });
  it('requires all ratings and guide acknowledgement before submitting',async()=>{
    rpc.mockResolvedValue({data:{correct_count:5,question_count:5,passed:true,feedback:[]},error:null});
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
