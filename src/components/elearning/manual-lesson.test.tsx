import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
const part=(id:string)=>({id,concept_ids:['concept'],asset_ids:[],heading_en:id,heading_fil:id,body_en:'Short content',body_fil:'Maikling aralin',check:null});
const data={title_fil:'Manual',title_en:'Manual',chapters:[],completed:[],resumes:[],lessons:[{id:'lesson',module_id:'module',required:true,title_fil:'Lesson',title_en:'Lesson',objectives_fil:['Layunin'],objectives_en:['Objective'],revision:{id:'revision',read_sections:[part('first'),part('second')],slides:[{...part('slide'),display_en:'Slide content',display_fil:'Slide',layout:'scene'}],assets:[],sources:[]}}]} as unknown as ReferenceData;
describe('route lesson viewer',()=>{
  it('shows explicit clock times for the pilot morning story until its new revision is published',()=>{
    const old='At eight, BHW Marites leads a discussion. At ten, she meets a council member. At eleven, she calls the midwife.';
    const roleLesson={...data,lessons:data.lessons.map(l=>({...l,lesson_key:'bhw-roles-hepo',revision:{...l.revision,read_sections:[{...part('morning'),body_en:old}]}}))} as unknown as ReferenceData;
    render(<ReferenceLessons {...roleLesson} modules={[]} locale="en" initialLessonId="lesson" readOnly onResume={vi.fn()} onComplete={vi.fn()}/>);
    expect(screen.getByText('At 8:00 a.m., BHW Marites leads a discussion. At 10:00 a.m., she meets a council member. At 11:00 a.m., she calls the midwife.')).toBeInTheDocument();
  });
  it('reflows Lesson 1.1.1 in the presenter while keeping published text and paging',()=>{
    const showModal = HTMLDialogElement.prototype.showModal;
    const close = HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal = function () {this.setAttribute('open','');};
    HTMLDialogElement.prototype.close = function () {this.removeAttribute('open');};
    const roleLesson = {...data,lessons:data.lessons.map(l=>({...l,lesson_key:'bhw-roles-hepo'}))};
    try {
      const {container}=render(<ReferenceLessons {...roleLesson} modules={[]} locale="en" initialLessonId="lesson" lessonBaseHref="/lessons" readOnly onResume={vi.fn()} onComplete={vi.fn()}/>);
      fireEvent.click(screen.getByRole('button',{name:'Full screen'}));
      const dialog=container.querySelector('dialog')!;
      expect(dialog.querySelector('.bhw111-presenter .bhw111-story')).toBeInTheDocument();
      expect(within(dialog).getByRole('img',{name:/BHW Marites talks with residents/})).toBeInTheDocument();
      expect(within(dialog).getByText('Short content')).toBeInTheDocument();
      expect(dialog.querySelector('[data-reader-viewport]')).not.toBeInTheDocument();
      expect(within(dialog).queryByRole('button',{name:'Fit'})).not.toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button',{name:'Next'}));
      expect(within(dialog).getByRole('heading',{name:'second'})).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button',{name:'Slides'}));
      expect(within(dialog).getByText('Slide content')).toBeInTheDocument();
    } finally {
      HTMLDialogElement.prototype.showModal = showModal;
      HTMLDialogElement.prototype.close = close;
    }
  });
  it('opens only the reader content and keeps mode, orientation, and paging inside it',()=>{
    const showModal = HTMLDialogElement.prototype.showModal;
    const close = HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal = function () {this.setAttribute('open','');};
    HTMLDialogElement.prototype.close = function () {this.removeAttribute('open');};
    try {
      const {container}=render(<ReferenceLessons {...data} modules={[]} locale="en" initialLessonId="lesson" lessonBaseHref="/lessons" readOnly onResume={vi.fn()} onComplete={vi.fn()}/>);
      fireEvent.click(screen.getByRole('button',{name:'Full screen'}));
      const dialog=container.querySelector('dialog')!;
      expect(dialog).toHaveAttribute('open');
      expect(within(dialog).getByRole('heading',{name:'first'})).toBeInTheDocument();
      expect(within(dialog).queryByText('Estimated 3–7 minutes for independent study; facilitated practice is separate.')).not.toBeInTheDocument();
      expect(dialog.querySelector('[data-reader-viewport]')).not.toContainElement(within(dialog).getByRole('navigation',{name:'Lesson position'}));
      expect(within(dialog).getByRole('button',{name:'Zoom out'})).toBeDisabled();
      fireEvent.click(within(dialog).getByRole('button',{name:'Zoom in'}));
      expect(within(dialog).getByText('1.25×')).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button',{name:'Fit'}));
      expect(within(dialog).getByText('1×')).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button',{name:'Landscape'}));
      expect(within(dialog).getByRole('button',{name:'Landscape'})).toHaveAttribute('aria-pressed','true');
      expect(dialog.querySelector('.lesson-reader-surface')).toHaveAttribute('data-orientation','landscape');
      fireEvent.click(within(dialog).getByRole('button',{name:'Slides'}));
      expect(within(dialog).getByText('Slide content')).toBeInTheDocument();
      expect(within(dialog).getByText('1×')).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button',{name:'Read'}));
      fireEvent.click(within(dialog).getByRole('button',{name:'Next'}));
      expect(within(dialog).getByRole('heading',{name:'second'})).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button',{name:'Close'}));
      expect(dialog).not.toHaveAttribute('open');
      expect(screen.getByRole('heading',{name:'second'})).toBeInTheDocument();
    } finally {
      HTMLDialogElement.prototype.showModal = showModal;
      HTMLDialogElement.prototype.close = close;
    }
  });
  it('admin preview never offers completion or writes resume',async()=>{
    const save=vi.fn();render(<ReferenceLessons {...data} modules={[]} locale="en" initialLessonId="lesson" lessonBaseHref="/lessons" readOnly onResume={save} onComplete={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button',{name:'Next'}));
    expect(screen.getByRole('heading',{name:'second'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Mark lesson complete'})).not.toBeInTheDocument();expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('link',{name:'← Back to lessons'})).toHaveAttribute('href','/lessons');
  });
  it('paging quickly saves only the final position, once, after the debounce',async()=>{
    const save=vi.fn().mockResolvedValue(undefined);
    vi.useFakeTimers({shouldAdvanceTime:true});
    try{
      render(<ReferenceLessons {...data} resumes={[{lesson_id:'lesson',revision_id:'revision',course_progress_id:'mine',modality:'read',language:'en',position_key:'second',concept_id:'concept',updated_at:'2026-09-24'}]} modules={[]} locale="en" initialLessonId="lesson" lessonBaseHref="/lessons" onResume={save} onComplete={vi.fn()}/>);
      fireEvent.click(screen.getByRole('button',{name:'Previous'}));
      fireEvent.click(screen.getByRole('button',{name:'Next'}));
      fireEvent.click(screen.getByRole('button',{name:'Previous'}));
      expect(save).not.toHaveBeenCalled();
      await act(()=>vi.advanceTimersByTimeAsync(3000));
    }finally{vi.useRealTimers();}
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({lesson_id:'lesson',modality:'read',position_key:'first'}));
  });
  it('reload restores saved position and retries a failed write',async()=>{
    const save=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    render(<ReferenceLessons {...data} resumes={[{lesson_id:'lesson',revision_id:'revision',course_progress_id:'mine',modality:'read',language:'en',position_key:'second',concept_id:'concept',updated_at:'2026-09-24'}]} modules={[]} locale="en" initialLessonId="lesson" lessonBaseHref="/lessons" onResume={save} onComplete={vi.fn()}/>);
    expect(screen.getByRole('heading',{name:'second'})).toBeInTheDocument();
    // Resume saves are debounced; the write (and its failure) lands once the
    // position has been still for the delay.
    vi.useFakeTimers({shouldAdvanceTime:true});
    try{
      fireEvent.click(screen.getByRole('button',{name:'Previous'}));
      expect(save).not.toHaveBeenCalled();
      await act(()=>vi.advanceTimersByTimeAsync(3000));
    }finally{vi.useRealTimers();}
    await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Retry saving position'}));
    await waitFor(()=>expect(screen.queryByRole('alert')).not.toBeInTheDocument());expect(save).toHaveBeenCalledTimes(2);
  });
});
