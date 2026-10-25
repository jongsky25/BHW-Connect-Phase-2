import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {loadReferenceModule,contentHash} from '../../../scripts/lib/reference-content.mjs';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';
import {educatorSectionContext} from '@/lib/elearning/educator-section-context';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
const source=loadReferenceModule('content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw','public').lessons.find(l=>l.manifest.lesson_key==='bhw-health-educator')!;
const lesson={...source.manifest,id:'lesson',revision:{...source.revision,id:'revision',content_hash:contentHash(source)}} as ReferenceData['lessons'][number];
const data={title_en:'Manual',title_fil:'Manual',chapters:[],lessons:[lesson],completed:[],resumes:[]};

for(const en of [true,false])for(const mode of ['read','slides'] as const)for(const fullscreen of [true,false]){
  it(`connects all four sections with the correct Read excerpts and keeps self-check gates (${en}, ${mode}, fullscreen=${fullscreen})`,()=>{
    const show=HTMLDialogElement.prototype.showModal,close=HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
    HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
    const onResume=vi.fn(),onComplete=vi.fn();
    try{
      const {container}=render(<ReferenceLessons {...data} modules={[]} initialLessonId="lesson" initialMode={mode} locale={en?'en':'fil'} readOnly onResume={onResume} onComplete={onComplete}/>);
      if(fullscreen)fireEvent.click(screen.getByRole('button',{name:en?'Full screen':'Buong screen'}));
      const view=fullscreen?within(container.querySelector('dialog')!):screen;
      const next=()=>fireEvent.click(view.getByRole('button',{name:en?'Next':'Susunod'}));
      for(const [index,section]of lesson.revision.read_sections.slice(0,4).entries()){
        if(index)next();
        const context=educatorSectionContext(lesson,mode==='slides'?section.id+'-slide':section.id,en)!;
        const figure=view.getByRole('figure',{name:context.title});
        expect(figure).toHaveAttribute('data-educator-context',section.id);
        expect(within(figure).getAllByRole('listitem')).toHaveLength(4);
        expect(figure.querySelector('[aria-current="step"]')).toHaveTextContent(context.steps[index]);
        expect(figure).toHaveTextContent(context.bridge);
        if(mode==='slides')expect(figure.querySelector('blockquote')).toHaveTextContent(context.excerpt);
        else expect(figure.querySelector('blockquote')).toBeNull();
      }
      next();
      expect(container.querySelector('[data-educator-context]')).toBeNull();
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
  expect(educatorSectionContext({...lesson,lesson_key:'other'},'life-stages',true)).toBeNull();
  expect(educatorSectionContext({...lesson,revision:{...lesson.revision,content_hash:'new'}},'life-stages',true)).toBeNull();
  expect(educatorSectionContext(lesson,'missing',true)).toBeNull();
  expect(educatorSectionContext(lesson,'toString',true)).toBeNull();
  expect(educatorSectionContext({...lesson,revision:{...lesson.revision,read_sections:[]}},'life-stages',true)).toBeNull();
  const changed=lesson.revision.read_sections.map(s=>({...s,body_en:'Translated or changed text'}));
  expect(educatorSectionContext({...lesson,revision:{...lesson.revision,read_sections:changed}},'life-stages',true)).toBeNull();
});
it('keeps completion unavailable until a check response and requires the existing explicit completion action',async()=>{
  const onComplete=vi.fn().mockResolvedValue(undefined);
  render(<ReferenceLessons {...data} modules={[]} initialLessonId="lesson" locale="en" onResume={vi.fn().mockResolvedValue(undefined)} onComplete={onComplete}/>);
  for(let i=0;i<4;i++)fireEvent.click(screen.getByRole('button',{name:'Next'}));
  expect(screen.getByRole('button',{name:'Mark lesson complete'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:lesson.revision.read_sections.at(-1)!.check!.options[1].en}));
  expect(screen.getByRole('button',{name:'Mark lesson complete'})).toBeEnabled();
  expect(onComplete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Mark lesson complete'}));
  await waitFor(()=>expect(onComplete).toHaveBeenCalledOnce());expect(onComplete).toHaveBeenCalledWith(lesson);
});
