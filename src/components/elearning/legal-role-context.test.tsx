import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {loadReferenceModule,contentHash} from '../../../scripts/lib/reference-content.mjs';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';
import {legalRoleContext,legalStoryContext} from '@/lib/elearning/legal-role-context';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
const source=loadReferenceModule('content/training/day1-basic-competencies/modules/04-ra7883','public').lessons.find(l=>l.manifest.lesson_key==='bhw-legal-role')!;
const lesson={...source.manifest,id:'lesson',revision:{...source.revision,id:'revision',content_hash:contentHash(source)}} as ReferenceData['lessons'][number];
const data={title_en:'Manual',title_fil:'Manual',chapters:[],lessons:[lesson],completed:[],resumes:[]};

for(const en of [true,false])for(const mode of ['read','slides'] as const)for(const fullscreen of [true,false]){
  it(`clarifies the fictional helper, legal source and accreditation roles while retaining self-check gates (${en}, ${mode}, fullscreen=${fullscreen})`,()=>{
    const show=HTMLDialogElement.prototype.showModal,close=HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
    HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
    const onResume=vi.fn(),onComplete=vi.fn();
    try{
      const {container}=render(<ReferenceLessons {...data} modules={[]} initialLessonId="lesson" initialMode={mode} locale={en?'en':'fil'} readOnly onResume={onResume} onComplete={onComplete}/>);
      if(fullscreen)fireEvent.click(screen.getByRole('button',{name:en?'Full screen':'Buong screen'}));
      const view=fullscreen?within(container.querySelector('dialog')!):screen;
      const next=()=>fireEvent.click(view.getByRole('button',{name:en?'Next':'Susunod'}));
      for(const [index,id]of ['section-1','section-2','roles-and-authority'].entries()){
        if(index)next();
        const context=legalRoleContext(lesson,mode==='slides'?'slide-'+id:id,en)!;
        const figure=view.getByRole('figure',{name:context.title});
        expect(within(figure).getAllByRole('listitem')).toHaveLength(context.cards.length);
        for(const card of context.cards)expect(figure).toHaveTextContent(card.text);
        expect(within(figure).getByRole('link')).toHaveAttribute('href',context.sourceUrl);
        expect(figure).toHaveTextContent(context.caption);
      }
      for(let i=0;i<3;i++){next();expect(container.querySelector('[data-legal-role-context]')).toBeNull();}
      const check=lesson.revision.read_sections.at(-1)!.check!;
      expect(view.getAllByRole('button').filter(b=>check.options.some(o=>b.textContent===(en?o.en:o.fil)))).toHaveLength(3);
      expect(view.queryByText(en?check.feedback_en:check.feedback_fil)).not.toBeInTheDocument();
      fireEvent.click(view.getByRole('button',{name:en?check.options[1].en:check.options[1].fil}));
      expect(view.getByText(en?check.feedback_en:check.feedback_fil)).toBeInTheDocument();
      fireEvent.click(view.getByRole('button',{name:en?'Narrated story':'Kuwentong may salaysay'}));
      const note=container.querySelector<HTMLElement>('[data-legal-story-context]')!;
      expect(note).toBeInTheDocument();expect(note).toHaveTextContent(legalStoryContext(lesson.revision.assets.find(a=>a.id==='bhw-legal-role-story')!,en)!.text);
      expect(within(note).getByRole('link')).toHaveAttribute('href','https://lawphil.net/statutes/repacts/ra1995/ra_7883_1995.html');
      expect(onResume).not.toHaveBeenCalled();expect(onComplete).not.toHaveBeenCalled();
    }finally{HTMLDialogElement.prototype.showModal=show;HTMLDialogElement.prototype.close=close;}
  });
}
it('requires the reviewed lesson, source, scene and exact Read text',()=>{
 expect(legalRoleContext({...lesson,lesson_key:'other'},'section-1',true)).toBeNull();
 expect(legalRoleContext({...lesson,revision:{...lesson.revision,content_hash:'changed'}},'section-1',true)).toBeNull();
 for(const position of ['missing','toString','legal-basis-check','slide-legal-basis-check'])expect(legalRoleContext(lesson,position,true)).toBeNull();
 for(const change of [{sources:[]},{assets:[]},{read_sections:[]},{slides:[]}]){
  const changed={...lesson,revision:{...lesson.revision,...change}};
  expect(legalRoleContext(changed,'slide-section-1',true)).toBeNull();
 }
 const changed=lesson.revision.read_sections.map(s=>({...s,body_en:'Translated text'}));
 expect(legalRoleContext({...lesson,revision:{...lesson.revision,read_sections:changed}},'section-1',true)).toBeNull();
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

it('rejects changed media and keeps unrelated stories unchanged',()=>{
 const asset=lesson.revision.assets.find(a=>a.id==='bhw-legal-role-story')!;
 expect(legalStoryContext({...asset,id:'other'},true)).toBeNull();
 expect(legalStoryContext({...asset,content_hash:'changed'},true)).toBeNull();
 const changed={...asset,videos:{...asset.videos!,en:{...asset.videos!.en,content_hash:'changed'}}};
 expect(legalStoryContext(changed,true)).toBeNull();
});
