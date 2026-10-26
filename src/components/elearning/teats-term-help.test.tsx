import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {loadReferenceModule,contentHash} from '../../../scripts/lib/reference-content.mjs';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
const source=loadReferenceModule('content/training/day1-basic-competencies/modules/03-polisiya-bhs','public').lessons.find(l=>l.manifest.lesson_key==='bhs-promotions')!;
const lesson={...source.manifest,id:'lesson',revision:{...source.revision,id:'revision',content_hash:contentHash(source)}} as ReferenceData['lessons'][number];
const data={title_en:'Manual',title_fil:'Manual',chapters:[],modules:[],lessons:[lesson],completed:[],resumes:[],readOnly:true,onResume:vi.fn(),onComplete:vi.fn()};

for(const locale of ['en','fil'] as const)for(const mode of ['read','slides'] as const)for(const fullscreen of [false,true]){
  it(`explains teats in ${locale} ${mode} fullscreen=${fullscreen} only where the term appears`,()=>{
    const show=HTMLDialogElement.prototype.showModal,close=HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
    HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
    try{
      const {container}=render(<ReferenceLessons {...data} locale={locale} initialLessonId="lesson" initialMode={mode}/>);
      if(fullscreen)fireEvent.click(screen.getByRole('button',{name:locale==='en'?'Full screen':'Buong screen'}));
      const view=fullscreen?within(container.querySelector('dialog')!):screen;
      expect(view.queryByRole('note')).not.toBeInTheDocument();
      fireEvent.click(view.getByRole('button',{name:locale==='en'?'Next':'Susunod'}));
      expect(view.getByRole('note')).toHaveTextContent(locale==='en'?'nipples fitted to feeding bottles':'tsupon ng feeding bottle');
      fireEvent.click(view.getByRole('button',{name:locale==='en'?'Next':'Susunod'}));
      expect(view.queryByRole('note')).not.toBeInTheDocument();
    }finally{HTMLDialogElement.prototype.showModal=show;HTMLDialogElement.prototype.close=close;}
  });
}

it('does not explain a future revision that removes the term',()=>{
  const changed={...lesson,revision:{...lesson.revision,read_sections:lesson.revision.read_sections.map(s=>s.id==='section-2'?{...s,body_en:'Different text.'}:s)}};
  render(<ReferenceLessons {...data} lessons={[changed]} locale="en" initialLessonId="lesson"/>);
  fireEvent.click(screen.getByRole('button',{name:'Next'}));
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
});
