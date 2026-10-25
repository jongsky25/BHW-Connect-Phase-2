import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {loadReferenceModule,contentHash} from '../../../scripts/lib/reference-content.mjs';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';
import {definitionSlideGuide,isDefinitionScene} from '@/lib/elearning/definition-slide-presentation';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
const source=loadReferenceModule('content/training/day1-basic-competencies/modules/07-problema','public').lessons.find(l=>l.manifest.lesson_key==='problem-define')!;
const lesson={...source.manifest,id:'lesson',revision:{...source.revision,id:'revision',content_hash:contentHash(source)}} as ReferenceData['lessons'][number];
const data={title_en:'Manual',title_fil:'Manual',chapters:[],lessons:[lesson],completed:[],resumes:[]};

for(const en of [true,false])for(const mode of ['read','slides'] as const)for(const fullscreen of [true,false]){
  it(`shows numbered text-bearing slides and bounded scenes without changing the self-check (${en}, ${mode}, fullscreen=${fullscreen})`,()=>{
    const show=HTMLDialogElement.prototype.showModal,close=HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
    HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
    const onResume=vi.fn(),onComplete=vi.fn();
    try{
      const {container}=render(<ReferenceLessons {...data} modules={[]} initialLessonId="lesson" initialMode={mode} locale={en?'en':'fil'} readOnly onResume={onResume} onComplete={onComplete}/>);
      if(fullscreen)fireEvent.click(screen.getByRole('button',{name:en?'Full screen':'Buong screen'}));
      const view=fullscreen?within(container.querySelector('dialog')!):screen;
      const next=()=>fireEvent.click(view.getByRole('button',{name:en?'Next':'Susunod'}));
      for(const [index,section]of lesson.revision.read_sections.entries()){
        if(index)next();
        const guide=container.querySelector('[data-definition-slide-guide]');
        if(mode==='slides'){
          expect(guide).toHaveTextContent(`Slide ${index+1} ${en?'of':'sa'} 6`);
          if(!section.check)expect(view.getByText(en?lesson.revision.slides[index].display_en:lesson.revision.slides[index].display_fil,{selector:'p'})).toBeInTheDocument();
        }else expect(guide).toBeNull();
        for(const id of lesson.revision.slides[index].asset_ids){const asset=lesson.revision.assets.find(a=>a.id===id)!;expect(view.getByRole('img',{name:en?asset.alt_en:asset.alt_fil})).toHaveClass('max-h-48','object-contain');}
      }
      const check=lesson.revision.read_sections.at(-1)!.check!;
      expect(view.getAllByRole('button').filter(b=>check.options.some(o=>b.textContent===(en?o.en:o.fil)))).toHaveLength(3);
      expect(view.queryByText(en?check.feedback_en:check.feedback_fil)).not.toBeInTheDocument();
      fireEvent.click(view.getByRole('button',{name:en?check.options[1].en:check.options[1].fil}));
      expect(view.getByText(en?check.feedback_en:check.feedback_fil)).toBeInTheDocument();
      expect(onResume).not.toHaveBeenCalled();expect(onComplete).not.toHaveBeenCalled();
    }finally{HTMLDialogElement.prototype.showModal=show;HTMLDialogElement.prototype.close=close;}
  });
}
it('limits the guide and bounded images to the reviewed identities',()=>{
 expect(definitionSlideGuide({...lesson,lesson_key:'other'},'slide-missed-visits',true)).toBeNull();
 expect(definitionSlideGuide({...lesson,revision:{...lesson.revision,content_hash:'changed'}},'slide-missed-visits',true)).toBeNull();
 expect(definitionSlideGuide(lesson,'missed-visits',true)).toBeNull();
 expect(definitionSlideGuide(lesson,'missing',true)).toBeNull();
 const asset=lesson.revision.assets.find(a=>a.id==='define-missed-visits')!;
 expect(isDefinitionScene(asset)).toBe(true);expect(isDefinitionScene({...asset,content_hash:'changed'})).toBe(false);expect(isDefinitionScene({...asset,path:'/other.png'})).toBe(false);expect(isDefinitionScene({...asset,review_status:'draft'})).toBe(false);
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
