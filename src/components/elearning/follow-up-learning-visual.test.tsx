import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {loadReferenceModule,contentHash} from '../../../scripts/lib/reference-content.mjs';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';
import {followUpLearningVisual} from '@/lib/elearning/follow-up-learning-visuals';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
const source=loadReferenceModule('content/training/day1-basic-competencies/modules/04-ra7883','public').lessons.find(l=>l.manifest.lesson_key==='bhw-follow-up')!;
const lesson={...source.manifest,id:'lesson',revision:{...source.revision,id:'revision',content_hash:contentHash(source)}} as ReferenceData['lessons'][number];
const data={title_en:'Manual',title_fil:'Manual',chapters:[],lessons:[lesson],completed:[],resumes:[]};

for(const en of [true,false])for(const mode of ['read','slides'] as const)for(const fullscreen of [true,false]){
  it(`shows three contextual diagrams while retaining the opening and self-check (${en}, ${mode}, fullscreen=${fullscreen})`,()=>{
    const show=HTMLDialogElement.prototype.showModal,close=HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
    HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
    const onResume=vi.fn(),onComplete=vi.fn();
    try{
      const {container}=render(<ReferenceLessons {...data} modules={[]} initialLessonId="lesson" initialMode={mode} locale={en?'en':'fil'} readOnly onResume={onResume} onComplete={onComplete}/>);
      if(fullscreen)fireEvent.click(screen.getByRole('button',{name:en?'Full screen':'Buong screen'}));
      const view=fullscreen?within(container.querySelector('dialog')!):screen;
      const next=()=>fireEvent.click(view.getByRole('button',{name:en?'Next':'Susunod'}));
      expect(container.querySelector('[data-follow-up-visual]')).not.toBeInTheDocument();
      expect(container.querySelector('img')).toHaveAttribute('src',expect.stringContaining('demi-follow-up'));
      next();expect(container.querySelector('[data-follow-up-visual]')).not.toBeInTheDocument();
      for(const [id,count] of [['known-and-unknown',3],['section-7',2],['next-contact-plan',4]] as const){
        next();
        const visual=followUpLearningVisual(lesson,mode==='slides'?'slide-'+id:id,en)!;
        const figure=view.getByRole('figure',{name:visual.title});
        expect(within(figure).getAllByRole('listitem')).toHaveLength(count);
        for(const card of visual.cards){expect(figure).toHaveTextContent(card.label);if(card.detail)expect(figure).toHaveTextContent(card.detail);}
      }
      next();
      expect(container.querySelector('[data-follow-up-visual]')).not.toBeInTheDocument();
      const check=lesson.revision.read_sections.at(-1)!.check!;
      expect(view.getAllByRole('button').filter(b=>check.options.some(o=>b.textContent===(en?o.en:o.fil)))).toHaveLength(3);
      expect(view.queryByText(en?check.feedback_en:check.feedback_fil)).not.toBeInTheDocument();
      fireEvent.click(view.getByRole('button',{name:en?check.options[1].en:check.options[1].fil}));
      expect(view.getByText(en?check.feedback_en:check.feedback_fil)).toBeInTheDocument();
      expect(onResume).not.toHaveBeenCalled();expect(onComplete).not.toHaveBeenCalled();
    }finally{HTMLDialogElement.prototype.showModal=show;HTMLDialogElement.prototype.close=close;}
  });
}
it('does not apply diagrams to another lesson, a changed revision or an unknown position',()=>{
  expect(followUpLearningVisual({...lesson,lesson_key:'other'},'known-and-unknown',true)).toBeNull();
  expect(followUpLearningVisual({...lesson,revision:{...lesson.revision,content_hash:'new'}},'known-and-unknown',true)).toBeNull();
  expect(followUpLearningVisual(lesson,'missing',true)).toBeNull();
  expect(followUpLearningVisual(lesson,'toString',true)).toBeNull();
  expect(followUpLearningVisual({...lesson,revision:{...lesson.revision,read_sections:[]}},'known-and-unknown',true)).toBeNull();
});
it('keeps completion unavailable until a check response and requires the existing explicit completion action',async()=>{
  const onComplete=vi.fn().mockResolvedValue(undefined);
  render(<ReferenceLessons {...data} modules={[]} initialLessonId="lesson" locale="en" onResume={vi.fn().mockResolvedValue(undefined)} onComplete={onComplete}/>);
  for(let i=0;i<5;i++)fireEvent.click(screen.getByRole('button',{name:'Next'}));
  expect(screen.getByRole('button',{name:'Mark lesson complete'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:lesson.revision.read_sections.at(-1)!.check!.options[1].en}));
  expect(screen.getByRole('button',{name:'Mark lesson complete'})).toBeEnabled();
  expect(onComplete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Mark lesson complete'}));
  await waitFor(()=>expect(onComplete).toHaveBeenCalledOnce());expect(onComplete).toHaveBeenCalledWith(lesson);
});
