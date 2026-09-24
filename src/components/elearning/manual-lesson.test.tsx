import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
const part=(id:string)=>({id,concept_ids:['concept'],asset_ids:[],heading_en:id,heading_fil:id,body_en:'Short content',body_fil:'Maikling aralin',check:null});
const data={title_fil:'Manual',title_en:'Manual',chapters:[],completed:[],resumes:[],lessons:[{id:'lesson',module_id:'module',required:true,title_fil:'Lesson',title_en:'Lesson',objectives_fil:['Layunin'],objectives_en:['Objective'],revision:{id:'revision',read_sections:[part('first'),part('second')],slides:[{...part('slide'),display_en:'Slide content',display_fil:'Slide',layout:'scene'}],assets:[],sources:[]}}]} as unknown as ReferenceData;
describe('route lesson viewer',()=>{
  it('admin preview never offers completion or writes resume',async()=>{
    const save=vi.fn();render(<ReferenceLessons {...data} modules={[]} locale="en" initialLessonId="lesson" lessonBaseHref="/lessons" readOnly onResume={save} onComplete={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button',{name:'Next',exact:true}));
    expect(screen.getByRole('heading',{name:'second'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Mark lesson complete'})).not.toBeInTheDocument();expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('link',{name:'← Back to lessons'})).toHaveAttribute('href','/lessons');
  });
  it('reload restores saved position and retries a failed write',async()=>{
    const save=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    render(<ReferenceLessons {...data} resumes={[{lesson_id:'lesson',revision_id:'revision',course_progress_id:'mine',modality:'read',language:'en',position_key:'second',concept_id:'concept',updated_at:'2026-09-24'}]} modules={[]} locale="en" initialLessonId="lesson" lessonBaseHref="/lessons" onResume={save} onComplete={vi.fn()}/>);
    expect(screen.getByRole('heading',{name:'second'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Previous',exact:true}));
    await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Retry saving position'}));
    await waitFor(()=>expect(screen.queryByRole('alert')).not.toBeInTheDocument());expect(save).toHaveBeenCalledTimes(2);
  });
});
