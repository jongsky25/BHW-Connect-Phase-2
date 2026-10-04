import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
const part=(id:string)=>({id,concept_ids:['concept'],asset_ids:[],heading_en:id,heading_fil:id,body_en:'Short content',body_fil:'Maikling aralin',check:null});
const data={title_fil:'Manual',title_en:'Manual',chapters:[],completed:[],resumes:[],lessons:[{id:'lesson',module_id:'module',required:true,title_fil:'Lesson',title_en:'Lesson',objectives_fil:['Layunin'],objectives_en:['Objective'],revision:{id:'revision',read_sections:[part('first'),part('second')],slides:[{...part('slide'),display_en:'Slide content',display_fil:'Slide',layout:'scene'}],assets:[],sources:[]}}]} as unknown as ReferenceData;
describe('route lesson viewer',()=>{
  it('opens Mimi’s full-screen story in the viewport orientation and returns to Read with one player',()=>{
    const showModal=HTMLDialogElement.prototype.showModal;
    const close=HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
    HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
    vi.stubGlobal('matchMedia',vi.fn((query:string)=>({matches:query==='(orientation: landscape)',media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
    const clip={id:'mimi-story',path:'/mimi-poster.png',alt_en:'Mimi story',alt_fil:'Kuwento ni Mimi',caption_en:'Mimi',caption_fil:'Mimi',videos:{en:{path:'/mimi-en.mp4'},fil:{path:'/mimi-fil.mp4'}}};
    const mimi={...data,lessons:data.lessons.map(l=>({...l,lesson_key:'bhs-support-environment',revision:{...l.revision,assets:[clip],featured_asset_id:clip.id}}))} as unknown as ReferenceData;
    try {
      const {container}=render(<ReferenceLessons {...mimi} modules={[]} locale="en" initialLessonId="lesson" readOnly onResume={vi.fn()} onComplete={vi.fn()}/>);
      fireEvent.click(screen.getByRole('button',{name:'Narrated story'}));
      fireEvent.click(screen.getByRole('button',{name:'Full screen'}));
      const dialog=container.querySelector('dialog')!;
      expect(within(dialog).getByRole('button',{name:'Landscape'})).toHaveAttribute('aria-pressed','true');
      expect(container.querySelectorAll('video')).toHaveLength(1);
      expect(dialog.querySelector('video source')).toHaveAttribute('src','/mimi-en.mp4');
      fireEvent.click(within(dialog).getByRole('button',{name:'Read'}));
      expect(container.querySelector('video')).not.toBeInTheDocument();
      expect(within(dialog).getByRole('heading',{name:'first'})).toBeInTheDocument();
    } finally {
      HTMLDialogElement.prototype.showModal=showModal;
      HTMLDialogElement.prototype.close=close;
      vi.unstubAllGlobals();
    }
  });
  it('shows a featured video only in the Video view, including full screen',()=>{
    const showModal = HTMLDialogElement.prototype.showModal;
    const close = HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal = function () {this.setAttribute('open','');};
    HTMLDialogElement.prototype.close = function () {this.removeAttribute('open');};
    const clip={id:'records-story',path:'/poster.png',alt_en:'Records story',alt_fil:'Kuwento ng tala',caption_en:'Records',caption_fil:'Mga tala',videos:{en:{path:'/records-en.mp4',captions:{path:'/records-en.vtt'}},fil:{path:'/records-fil.mp4',captions:{path:'/records-fil.vtt'}}}};
    const videoLesson={...data,lessons:data.lessons.map(l=>({...l,lesson_key:'bhw-records',revision:{...l.revision,assets:[clip],featured_asset_id:clip.id}}))} as unknown as ReferenceData;
    try {
      const {container}=render(<ReferenceLessons {...videoLesson} modules={[]} locale="en" initialLessonId="lesson" readOnly onResume={vi.fn()} onComplete={vi.fn()}/>);
      expect(container.querySelector('video')).not.toBeInTheDocument();
      expect(screen.getByRole('heading',{name:'first'})).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button',{name:'Narrated story'}));
      expect(container.querySelector('video source')).toHaveAttribute('src','/records-en.mp4');
      expect(screen.queryByRole('heading',{name:'first'})).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button',{name:'Slides'}));
      expect(container.querySelector('video')).not.toBeInTheDocument();
      expect(screen.getByText('Slide content')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button',{name:'Narrated story'}));
      fireEvent.click(screen.getByRole('button',{name:'Full screen'}));
      const dialog=container.querySelector('dialog')!;
      expect(dialog.querySelector('video source')).toHaveAttribute('src','/records-en.mp4');
      expect(container.querySelectorAll('video')).toHaveLength(1);
      fireEvent.click(within(dialog).getByRole('button',{name:'Read'}));
      expect(dialog.querySelector('video')).not.toBeInTheDocument();
      expect(within(dialog).getByRole('heading',{name:'first'})).toBeInTheDocument();
    } finally {
      HTMLDialogElement.prototype.showModal = showModal;
      HTMLDialogElement.prototype.close = close;
    }
  });
  it('allows lesson completion after Read checks without requiring the optional video',()=>{
    const clip={id:'records-story',path:'/poster.png',alt_en:'Records story',alt_fil:'Kuwento ng tala',caption_en:'Records',caption_fil:'Mga tala',videos:{en:{path:'/records-en.mp4'}}};
    const videoLesson={...data,lessons:data.lessons.map(l=>({...l,lesson_key:'bhw-records',revision:{...l.revision,assets:[clip],featured_asset_id:clip.id}}))} as unknown as ReferenceData;
    const onComplete=vi.fn().mockResolvedValue(undefined);
    render(<ReferenceLessons {...videoLesson} modules={[]} locale="en" initialLessonId="lesson" onResume={vi.fn().mockResolvedValue(undefined)} onComplete={onComplete}/>);
    fireEvent.click(screen.getByRole('button',{name:'Next'}));
    expect(screen.getByRole('button',{name:'Mark lesson complete'})).toBeEnabled();
  });
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
      expect(dialog.querySelector('.reference-story-presenter .reference-story')).toBeInTheDocument();
      expect(within(dialog).getByRole('img',{name:/BHW Riza talks with residents/})).toBeInTheDocument();
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
  it('reflows Lesson 1.1.2 with its own illustration in Read and Slides',()=>{
    const showModal = HTMLDialogElement.prototype.showModal;
    const close = HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal = function () {this.setAttribute('open','');};
    HTMLDialogElement.prototype.close = function () {this.removeAttribute('open');};
    const educatorLesson = {...data,lessons:data.lessons.map(l=>({...l,lesson_key:'bhw-health-educator'}))};
    try {
      const {container}=render(<ReferenceLessons {...educatorLesson} modules={[]} locale="en" initialLessonId="lesson" lessonBaseHref="/lessons" readOnly onResume={vi.fn()} onComplete={vi.fn()}/>);
      fireEvent.click(screen.getByRole('button',{name:'Full screen'}));
      const dialog=container.querySelector('dialog')!;
      expect(dialog.querySelector('.reference-story[data-lesson="bhw-health-educator"]')).toBeInTheDocument();
      expect(within(dialog).getByRole('img',{name:/A BHW listens to a young person/})).toBeInTheDocument();
      expect(dialog.querySelector('[data-reader-viewport]')).not.toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button',{name:'Slides'}));
      expect(within(dialog).getByText('Slide content')).toBeInTheDocument();
      expect(dialog.querySelector('.reference-story[data-lesson="bhw-health-educator"]')).toBeInTheDocument();
    } finally {
      HTMLDialogElement.prototype.showModal = showModal;
      HTMLDialogElement.prototype.close = close;
    }
  });
  it('reflows Lesson 1.1.3 with its community planning illustration in Read and Slides',()=>{
    const showModal = HTMLDialogElement.prototype.showModal;
    const close = HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal = function () {this.setAttribute('open','');};
    HTMLDialogElement.prototype.close = function () {this.removeAttribute('open');};
    const organizerLesson = {...data,lessons:data.lessons.map(l=>({...l,lesson_key:'bhw-community-organizer'}))};
    try {
      const {container}=render(<ReferenceLessons {...organizerLesson} modules={[]} locale="en" initialLessonId="lesson" lessonBaseHref="/lessons" readOnly onResume={vi.fn()} onComplete={vi.fn()}/>);
      fireEvent.click(screen.getByRole('button',{name:'Full screen'}));
      const dialog=container.querySelector('dialog')!;
      expect(dialog.querySelector('.reference-story[data-lesson="bhw-community-organizer"]')).toBeInTheDocument();
      expect(within(dialog).getByRole('img',{name:/BHW Riza listens as residents and health staff/})).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button',{name:'Slides'}));
      expect(within(dialog).getByText('Slide content')).toBeInTheDocument();
      expect(dialog.querySelector('.reference-story[data-lesson="bhw-community-organizer"]')).toBeInTheDocument();
    } finally {
      HTMLDialogElement.prototype.showModal = showModal;
      HTMLDialogElement.prototype.close = close;
    }
  });
  it('uses Vlanche and Mang Ernesto artwork for Lesson 1.2.1 in Read and Slides',()=>{
    const coverageLesson = {...data,lessons:data.lessons.map(l=>({...l,lesson_key:'uhc-coverage'}))};
    render(<ReferenceLessons {...coverageLesson} modules={[]} locale="en" initialLessonId="lesson" lessonBaseHref="/lessons" readOnly onResume={vi.fn()} onComplete={vi.fn()}/>);
    expect(screen.getByRole('img',{name:/BHW Vlanche listens to Mang Ernesto/})).toBeInTheDocument();
    expect(document.querySelector('.reference-story[data-lesson="uhc-coverage"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Slides'}));
    expect(screen.getByRole('img',{name:/BHW Vlanche listens to Mang Ernesto/})).toBeInTheDocument();
  });
  it('shows Lesson 1.2.2 artwork in Read and Slides and opens its narrated story with captions',()=>{
    const clip={id:'uhc-primary-care-story',path:'/poster.jpg',alt_en:'Vlanche and Mang Ernesto story',alt_fil:'Kuwento nina Vlanche at Mang Ernesto',caption_en:'Next step',caption_fil:'Susunod na hakbang',videos:{en:{path:'/primary-care-en.mp4',captions:{path:'/primary-care-en.vtt'}},fil:{path:'/primary-care-fil.mp4',captions:{path:'/primary-care-fil.vtt'}}}};
    const lesson={...data,lessons:data.lessons.map(l=>({...l,lesson_key:'uhc-primary-care',revision:{...l.revision,read_sections:[{...part('bridge'),heading_en:'Four changes, one journey'}],slides:[{...part('slide-bridge'),display_en:'Outpatient consultation',display_fil:'Outpatient consultation',layout:'process'}],assets:[clip],featured_asset_id:clip.id}}))} as unknown as ReferenceData;
    const {container,rerender}=render(<ReferenceLessons {...lesson} modules={[]} locale="en" initialLessonId="lesson" readOnly onResume={vi.fn()} onComplete={vi.fn()}/>);
    expect(container.querySelector('.reference-story[data-lesson="uhc-primary-care"]')).toBeInTheDocument();
    expect(screen.getByRole('img',{name:/BHW Vlanche and Mang Ernesto confirm/}).getAttribute('src')).toContain('primary-care-next-step-a67521f903c0.png');
    fireEvent.click(screen.getByRole('button',{name:'Slides'}));
    expect(screen.getByRole('img',{name:/BHW Vlanche and Mang Ernesto confirm/})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/Watch the animated narrated story/}));
    const video=container.querySelector('video')!;
    expect(video).toBeInTheDocument();
      expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(video.muted).toBe(false);
    expect(video.querySelector('source')).toHaveAttribute('src','/primary-care-en.mp4');
    expect(video.querySelector('track')).toHaveAttribute('src','/primary-care-en.vtt');
    rerender(<ReferenceLessons {...lesson} modules={[]} locale="fil" initialLessonId="lesson" readOnly onResume={vi.fn()} onComplete={vi.fn()}/>);
    expect(container.querySelector('video source')).toHaveAttribute('src','/primary-care-fil.mp4');
    expect(container.querySelector('video track')).toHaveAttribute('src','/primary-care-fil.vtt');
      fireEvent.click(screen.getByRole('button',{name:'Basahin'}));
      expect(container.querySelector('video')).not.toBeInTheDocument();
  });
  it('shows Lesson 1.1.6 artwork in Read and Slides and selects language-matched video and captions',()=>{
    const clip={id:'roles-application-story',path:'/poster.jpg',alt_en:'Riza handover story',alt_fil:'Kuwento ng handover ni Riza',caption_en:'Handover',caption_fil:'Handover',videos:{en:{path:'/application-en.mp4',captions:{path:'/application-en.vtt'}},fil:{path:'/application-fil.mp4',captions:{path:'/application-fil.vtt'}}}};
    const lesson={...data,lessons:data.lessons.map(l=>({...l,lesson_key:'bhw-roles-application',revision:{...l.revision,assets:[clip],featured_asset_id:clip.id}}))} as unknown as ReferenceData;
    const {container,rerender}=render(<ReferenceLessons {...lesson} modules={[]} locale="en" initialLessonId="lesson" readOnly onResume={vi.fn()} onComplete={vi.fn()}/>);
    expect(container.querySelector('.reference-story[data-lesson="bhw-roles-application"]')).toBeInTheDocument();
    expect(screen.getByRole('img',{name:/BHW Riza reports to the midwife/}).getAttribute('src')).toContain('roles-application-328d2317d8fd.png');
    expect(container.querySelector('video')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Slides'}));
    expect(screen.getByRole('img',{name:/BHW Riza reports to the midwife/})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/Watch the animated narrated story/}));
    expect(container.querySelector('video source')).toHaveAttribute('src','/application-en.mp4');
    expect(container.querySelector('video track')).toHaveAttribute('src','/application-en.vtt');
    rerender(<ReferenceLessons {...lesson} modules={[]} locale="fil" initialLessonId="lesson" readOnly onResume={vi.fn()} onComplete={vi.fn()}/>);
    expect(container.querySelector('video source')).toHaveAttribute('src','/application-fil.mp4');
    expect(container.querySelector('video track')).toHaveAttribute('src','/application-fil.vtt');
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
