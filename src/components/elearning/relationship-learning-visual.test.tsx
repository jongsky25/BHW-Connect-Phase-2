import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {loadReferenceModule,contentHash} from '../../../scripts/lib/reference-content.mjs';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';
import {relationshipLearningVisual} from '@/lib/elearning/relationship-learning-visuals';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
const source=loadReferenceModule('content/training/day1-basic-competencies/modules/05-bhw-at-barangay','public').lessons.find(l=>l.manifest.lesson_key==='bhw-relationships')!;
const lesson={...source.manifest,id:'lesson',revision:{...source.revision,id:'revision',content_hash:contentHash(source)}} as ReferenceData['lessons'][number];
const data={title_en:'Manual',title_fil:'Manual',chapters:[],lessons:[lesson],completed:[],resumes:[]};

for(const en of [true,false])for(const mode of ['read','slides'] as const)for(const fullscreen of [true,false]){
  it(`illustrates all four formerly text-only sections without pre-answer feedback (${en}, ${mode}, fullscreen=${fullscreen})`,()=>{
    const show=HTMLDialogElement.prototype.showModal,close=HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
    HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
    const onResume=vi.fn(),onComplete=vi.fn();
    try{
      const {container}=render(<ReferenceLessons {...data} modules={[]} initialLessonId="lesson" initialMode={mode} locale={en?'en':'fil'} readOnly onResume={onResume} onComplete={onComplete}/>);
      if(fullscreen)fireEvent.click(screen.getByRole('button',{name:en?'Full screen':'Buong screen'}));
      const view=fullscreen?within(container.querySelector('dialog')!):screen;
      const next=()=>fireEvent.click(view.getByRole('button',{name:en?'Next':'Susunod'}));
      expect(container.querySelector('[data-relationship-visual]')).not.toBeInTheDocument();
      next();
      const roleTitle=en?'Role and limit map':'Balangkas ng papel at hangganan';
      expect(within(view.getByRole('figure',{name:roleTitle})).getAllByRole('listitem')).toHaveLength(4);
      // Original purpose lines are shown once in their cards, not repeated as plain slides.
      for(const line of (en?lesson.revision.slides[1].display_en:lesson.revision.slides[1].display_fil).split('\n'))expect(view.getAllByText(line)).toHaveLength(1);
      next();expect(view.getByRole('figure',{name:en?'Known and still to clarify':'Alam at kailangan pang linawin'})).toBeInTheDocument();
      next();expect(view.getByRole('figure',{name:en?'Concern → confirmed role':'Alalahanin → natiyak na papel'})).toBeInTheDocument();
      next();expect(container.querySelector('[data-relationship-visual]')).not.toBeInTheDocument();
      next();
      const practice=view.getByRole('figure',{name:en?'Four practice cards':'Apat na practice card'});
      expect(within(practice).getAllByRole('listitem')).toHaveLength(4);
      const check=lesson.revision.read_sections.at(-1)!.check!;
      for(const option of check.options)expect(practice).not.toHaveTextContent(en?option.en:option.fil);
      expect(view.queryByText(en?check.feedback_en:check.feedback_fil)).not.toBeInTheDocument();
      fireEvent.click(view.getByRole('button',{name:en?check.options[1].en:check.options[1].fil}));
      expect(view.getByText(en?check.feedback_en:check.feedback_fil)).toBeInTheDocument();
      expect(onResume).not.toHaveBeenCalled();expect(onComplete).not.toHaveBeenCalled();
    }finally{HTMLDialogElement.prototype.showModal=show;HTMLDialogElement.prototype.close=close;}
  });
}
it('does not apply diagrams to another lesson, a changed revision or an unknown position',()=>{
  expect(relationshipLearningVisual({...lesson,lesson_key:'other'},'section-2',true)).toBeNull();
  expect(relationshipLearningVisual({...lesson,revision:{...lesson.revision,content_hash:'new'}},'section-2',true)).toBeNull();
  expect(relationshipLearningVisual(lesson,'missing',true)).toBeNull();
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
