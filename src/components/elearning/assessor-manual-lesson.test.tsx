import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {ManualLesson} from './manual-lesson';
import type {ReferenceData} from './reference-lessons';
const state=vi.hoisted(()=>({rpc:vi.fn(),refresh:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:state.refresh})}));
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({rpc:state.rpc})}));
const part=(id:string)=>({id,concept_ids:['concept'],asset_ids:[],heading_en:id,heading_fil:id,body_en:'Short content',body_fil:'Maikling aralin',check:null});
const data={title_fil:'Manual',title_en:'Manual',chapters:[],completed:[],resumes:[],lessons:[{id:'lesson',module_id:'module',required:true,title_fil:'Lesson',title_en:'Lesson',objectives_fil:['Layunin'],objectives_en:['Objective'],revision:{id:'revision',read_sections:[part('first'),part('second')],slides:[{...part('slide'),display_en:'Slide',display_fil:'Slide',layout:'scene'}],assets:[],sources:[]}}]} as unknown as ReferenceData;
beforeEach(()=>{state.rpc.mockReset().mockResolvedValue({error:null});state.refresh.mockReset();});
afterEach(()=>{cleanup();vi.useRealTimers();});
const reader=(assessorChapterId?:string,readOnly=false)=><ManualLesson data={data} modules={[]} locale="en" lessonId="lesson" baseHref="/study" readOnly={readOnly} lessonNumber={1} lessonCount={42} assessorChapterId={assessorChapterId}/>;
describe('assessor study persistence in existing reader',()=>{
  it('saves debounced positions only to the assessor chapter API',async()=>{
    vi.useFakeTimers({shouldAdvanceTime:true});render(reader('chapter'));
    fireEvent.click(screen.getByRole('button',{name:'Next'}));
    expect(state.rpc).not.toHaveBeenCalled();
    await act(()=>vi.advanceTimersByTimeAsync(3000));
    expect(state.rpc).toHaveBeenCalledTimes(1);
    expect(state.rpc).toHaveBeenCalledWith('rpc_assessor_lesson_resume',expect.objectContaining({p_chapter_id:'chapter',p_lesson_id:'lesson',p_revision_id:'revision',p_position_key:'second',p_language:'en'}));
  });
  it('completes assessor lessons without touching BHW APIs',async()=>{
    render(reader('chapter'));fireEvent.click(screen.getByRole('button',{name:'Next'}));fireEvent.click(screen.getByRole('button',{name:'Mark lesson complete'}));
    await waitFor(()=>expect(state.refresh).toHaveBeenCalledOnce());
    expect(state.rpc).toHaveBeenCalledWith('rpc_assessor_lesson_complete',{p_chapter_id:'chapter',p_lesson_id:'lesson',p_revision_id:'revision'});
    expect(state.rpc.mock.calls.every(([name])=>name.startsWith('rpc_assessor_'))).toBe(true);
  });
  it('retains BHW completion and read-only preview behavior',async()=>{
    const {unmount}=render(reader());fireEvent.click(screen.getByRole('button',{name:'Next'}));fireEvent.click(screen.getByRole('button',{name:'Mark lesson complete'}));
    await waitFor(()=>expect(state.rpc).toHaveBeenCalledWith('rpc_course_lesson_complete',{p_lesson_id:'lesson',p_revision_id:'revision'}));
    unmount();state.rpc.mockClear();render(reader('chapter',true));
    fireEvent.click(screen.getByRole('button',{name:'Next'}));
    expect(screen.queryByRole('button',{name:'Mark lesson complete'})).not.toBeInTheDocument();
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it('shows save errors and does not claim completion when the server refuses',async()=>{
    state.rpc.mockResolvedValue({error:new Error('lesson revision changed')});render(reader('chapter'));
    fireEvent.click(screen.getByRole('button',{name:'Next'}));fireEvent.click(screen.getByRole('button',{name:'Mark lesson complete'}));
    await screen.findByRole('alert');expect(state.refresh).not.toHaveBeenCalled();
  });
});
