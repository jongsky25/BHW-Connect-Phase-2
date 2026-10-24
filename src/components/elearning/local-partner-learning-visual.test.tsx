import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {loadReferenceModule,contentHash} from '../../../scripts/lib/reference-content.mjs';
import {LessonAssetFigure} from './lesson-asset-figure';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';
import {localPartnerVisual,localPartnerScenePurpose} from '@/lib/elearning/local-partner-visuals';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
const source=loadReferenceModule('content/training/day1-basic-competencies/modules/05-bhw-at-barangay','public').lessons.find(l=>l.manifest.lesson_key==='bhw-local-partners')!;
const lesson={...source.manifest,id:'lesson',revision:{...source.revision,id:'revision',content_hash:contentHash(source)}} as ReferenceData['lessons'][number];
const data={title_en:'Manual',title_fil:'Manual',chapters:[],lessons:[lesson],completed:[],resumes:[]};

for(const en of [true,false])for(const mode of ['read','slides'] as const)for(const fullscreen of [true,false]){
  it(`explains all six visuals while retaining the scene and self-check (${en}, ${mode}, fullscreen=${fullscreen})`,()=>{
    const show=HTMLDialogElement.prototype.showModal,close=HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
    HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
    const onResume=vi.fn(),onComplete=vi.fn();
    try{
      const {container}=render(<ReferenceLessons {...data} modules={[]} initialLessonId="lesson" initialMode={mode} locale={en?'en':'fil'} readOnly onResume={onResume} onComplete={onComplete}/>);
      if(fullscreen)fireEvent.click(screen.getByRole('button',{name:en?'Full screen':'Buong screen'}));
      const view=fullscreen?within(container.querySelector('dialog')!):screen;
      const next=()=>fireEvent.click(view.getByRole('button',{name:en?'Next':'Susunod'}));
      expect(container.querySelector('img')).toHaveAttribute('src',expect.stringContaining('malou-local-coordination'));
      expect(container.querySelector('[data-local-partner-scene-purpose]')).toHaveTextContent(localPartnerScenePurpose(lesson.revision.assets.find(a=>a.id==='malou-local-coordination')!,en)!);
      for(const [index,section]of lesson.revision.read_sections.entries()){
        if(index)next();
        const asset=lesson.revision.assets.find(a=>a.id===section.asset_ids[1])!;
        const visual=localPartnerVisual(asset,en)!;
        const figure=view.getByRole('figure',{name:visual.title});
        expect(within(figure).getAllByRole('listitem')).toHaveLength(visual.cards.length);
        expect(figure.querySelector('img')).toBeNull();
        expect(figure.querySelector('[data-ai-visual-label]')).toBeNull();
        for(const card of visual.cards)expect(figure).toHaveTextContent(visual.kind==='steps'?card.replace(/^\d+\. /,''):card);
      }
      const check=lesson.revision.read_sections.at(-1)!.check!;
      expect(view.getAllByRole('button').filter(b=>check.options.some(o=>b.textContent===(en?o.en:o.fil)))).toHaveLength(3);
      const practice=container.querySelector('[data-local-partner-visual="local-partners-application-check"]')!;
      for(const option of check.options)expect(practice).not.toHaveTextContent(en?option.en:option.fil);
      expect(view.queryByText(en?check.feedback_en:check.feedback_fil)).not.toBeInTheDocument();
      fireEvent.click(view.getByRole('button',{name:en?check.options[1].en:check.options[1].fil}));
      expect(view.getByText(en?check.feedback_en:check.feedback_fil)).toBeInTheDocument();
      expect(onResume).not.toHaveBeenCalled();expect(onComplete).not.toHaveBeenCalled();
    }finally{HTMLDialogElement.prototype.showModal=show;HTMLDialogElement.prototype.close=close;}
  });
}
it('requires the exact approved asset identity and leaves videos and unknown assets alone',()=>{
  const asset=lesson.revision.assets.find(a=>a.id==='local-partners-clarify')!;
  for(const changed of [{id:'other'},{id:'toString'},{path:'/other.svg'},{content_hash:'new'},{review_status:'draft' as const},{video:{path:'/v.mp4',content_hash:'v',duration_s:1}}])expect(localPartnerVisual({...asset,...changed},true)).toBeNull();
  const scene=lesson.revision.assets.find(a=>a.id==='malou-local-coordination')!;
  expect(localPartnerScenePurpose({...scene,content_hash:'new'},true)).toBeNull();
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

it('retains translated static-asset captions rather than inserting English or Filipino into another language',()=>{
 const asset=lesson.revision.assets.find(a=>a.id==='local-partners-clarify')!;
 const {container}=render(<LessonAssetFigure asset={{...asset,caption_fil:'Reviewed translated caption'}} en={false} language="hil"/>);
 expect(container.querySelector('[data-local-partner-visual]')).toBeNull();
 expect(screen.getByText('Reviewed translated caption')).toBeInTheDocument();
 expect(container.querySelector('img')).toHaveAttribute('src',asset.path);
});
