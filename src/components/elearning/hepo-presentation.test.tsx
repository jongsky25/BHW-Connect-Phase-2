import fs from 'node:fs';
import {narrationForLesson} from '@/lib/elearning/reference-narration';
import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {loadReferenceModule,contentHash} from '../../../scripts/lib/reference-content.mjs';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';
import {hepoSlideDisplay,isHepoPresentation,hepoSectionGoal} from '@/lib/elearning/hepo-presentation';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
const source=loadReferenceModule('content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw','public').lessons.find(l=>l.manifest.lesson_key==='bhw-roles-hepo')!;
const lesson={...source.manifest,id:'lesson',revision:{...source.revision,id:'revision',content_hash:contentHash(source)}} as ReferenceData['lessons'][number];
const data={title_en:'Manual',title_fil:'Manual',chapters:[],lessons:[lesson],completed:[],resumes:[]};

for(const en of [true,false])for(const fullscreen of [true,false]){
 it(`shows Riza’s illustrated story slides with retained summaries and assessment (${en}, fullscreen=${fullscreen})`,()=>{
  const show=HTMLDialogElement.prototype.showModal,close=HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  try{
   const onResume=vi.fn(),onComplete=vi.fn();
   const {container}=render(<ReferenceLessons {...data} modules={[]} initialLessonId="lesson" locale={en?'en':'fil'} readOnly onResume={onResume} onComplete={onComplete}/>);
   if(fullscreen)fireEvent.click(screen.getByRole('button',{name:en?'Full screen':'Buong screen'}));
   const view=fullscreen?within(container.querySelector('dialog')!):screen;
   expect(view.getByRole('img',{name:/BHW Riza/})).toBeInTheDocument();
   expect(view.getByText(en?lesson.revision.read_sections[0].body_en:lesson.revision.read_sections[0].body_fil)).toBeInTheDocument();
   if(!en)expect(view.getByText(/Kaya mas malawak ang papel na ginagampanan/)).toBeInTheDocument();
   expect(view.getByText(en?'Section 1 of 5':'Bahagi 1 sa 5')).toBeInTheDocument();
   fireEvent.click(view.getByRole('button',{name:'Slides'}));
   for(const [i,slide]of lesson.revision.slides.entries()){
    expect(view.getByRole('heading',{name:en?slide.heading_en:slide.heading_fil})).toBeInTheDocument();
    const article=container.querySelector('article')!;
    expect(article).toHaveAttribute('data-scene',slide.id);
    expect(article).toHaveClass('reference-story');
    expect(view.getByRole('img',{name:/BHW Riza/})).toHaveAttribute('src',expect.stringContaining('scene-8cdb1498a723.png'));
    expect(container.querySelector('[data-hepo-presentation-guide]')).toBeNull();
    expect(article).toHaveAttribute('data-layout',slide.layout);

    if(!slide.check)for(const line of hepoSlideDisplay(slide.id,en?slide.display_en:slide.display_fil,en).split('\n'))expect(view.getByText(line)).toBeInTheDocument();
    if(i<4)fireEvent.click(view.getByRole('button',{name:en?'Next':'Susunod'}));
   }
   if(fullscreen){
    expect(container.querySelector('.reference-story-presenter')).toBeInTheDocument();
    expect(container.querySelector('[data-reader-viewport]')).toBeNull();
   }
   const checkHeading=lesson.revision.slides.at(-1)!;
   const check=checkHeading.check!;
   for(const option of check.options)expect(view.getByRole('button',{name:en?option.en:option.fil})).toBeInTheDocument();
   expect(view.queryByText(en?check.feedback_en:check.feedback_fil)).not.toBeInTheDocument();
   fireEvent.click(view.getByRole('button',{name:en?check.options[0].en:check.options[0].fil}));
   expect(view.getByText(en?check.feedback_en:check.feedback_fil)).toBeInTheDocument();
   fireEvent.click(view.getByRole('button',{name:en?'Read':'Basahin'}));
   expect(view.getByText(en?'Section 5 of 5':'Bahagi 5 sa 5')).toBeInTheDocument();
   expect(view.queryByText(en?check.feedback_en:check.feedback_fil)).not.toBeInTheDocument();
   fireEvent.click(view.getByRole('button',{name:'Slides'}));
   expect(view.getByText(en?check.feedback_en:check.feedback_fil)).toBeInTheDocument();
   fireEvent.click(view.getByRole('button',{name:en?'Narrated story':'Kuwentong may salaysay'}));
   expect(container.querySelectorAll('video')).toHaveLength(1);
   expect(container.querySelector('[data-hepo-presentation-guide]')).toBeNull();
   fireEvent.click(view.getByRole('button',{name:'Slides'}));
   expect(container.querySelector('video')).toBeNull();
   expect(view.getByRole('heading',{name:en?checkHeading.heading_en:checkHeading.heading_fil})).toBeInTheDocument();
   expect(onResume).not.toHaveBeenCalled();expect(onComplete).not.toHaveBeenCalled();
  }finally{HTMLDialogElement.prototype.showModal=show;HTMLDialogElement.prototype.close=close;}
 });
}
it('keeps saved-position alignment and explicit completion after a check response',async()=>{
 const onComplete=vi.fn().mockResolvedValue(undefined);
 const onResume=vi.fn().mockResolvedValue(undefined);
 render(<ReferenceLessons {...data} modules={[]} initialLessonId="lesson" locale="en" onResume={onResume} onComplete={onComplete}/>);
 fireEvent.click(screen.getByRole('button',{name:'Next'}));
 fireEvent.click(screen.getByRole('button',{name:'Slides'}));
 expect(screen.getByRole('heading',{name:lesson.revision.slides[1].heading_en})).toBeInTheDocument();
 for(let i=0;i<3;i++)fireEvent.click(screen.getByRole('button',{name:'Next'}));
 expect(screen.getByRole('button',{name:'Mark lesson complete'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:lesson.revision.slides.at(-1)!.check!.options[0].en}));
 expect(onComplete).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Mark lesson complete'}));
 await waitFor(()=>expect(onComplete).toHaveBeenCalledOnce());
 expect(onComplete).toHaveBeenCalledWith(lesson);
});
it('limits the presentation to the reviewed revision and refuses unknown sections',()=>{
 expect(isHepoPresentation(lesson)).toBe(true);
 expect(isHepoPresentation({...lesson,lesson_key:'other'})).toBe(false);
 expect(isHepoPresentation({...lesson,revision:{...lesson.revision,content_hash:'changed'}})).toBe(false);
 expect(hepoSectionGoal('toString',true)).toBeNull();
});

it.each([true,false])('retains the existing Listen recording after adding viewing guidance (%s)',en=>{
 const manifest=JSON.parse(fs.readFileSync('content/training/day1-basic-competencies/narration.json','utf8'));
 const narration=narrationForLesson(manifest,lesson.lesson_key,en?'en':'fil',lesson.revision.read_sections);
 expect(narration.morning).toBeDefined();
 const {container}=render(<ReferenceLessons {...data} modules={[]} initialLessonId="lesson" locale={en?'en':'fil'} readOnly narration={{lesson:narration}} onResume={vi.fn()} onComplete={vi.fn()}/>);
 expect(container.querySelector('audio')).toHaveAttribute('src',narration.morning.src);
});
