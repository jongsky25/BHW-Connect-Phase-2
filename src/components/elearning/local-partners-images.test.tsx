import fs from 'node:fs';
import path from 'node:path';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(()=>cleanup());
const base=path.resolve(process.cwd(),'content/training/day1-basic-competencies/modules/05-bhw-at-barangay/lessons/bhw-local-partners');
const read=(p:string)=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8'));
const source=read('lesson.json'),slides=read('slides.json');
const revision={id:'fixture-revision',featured_asset_id:null,
 read_sections:source.sections.map((s:Record<string,unknown>)=>({...s,body_en:s['body_en'],body_fil:s['body_fil']})),
 slides,assets:source.assets,sources:source.sources};
function view(locale:'en'|'fil'){
 const data={title_en:'Manual',title_fil:'Manwal',chapters:[],completed:[],resumes:[],lessons:[{
  id:'lesson-153-fixture',lesson_key:'bhw-local-partners',module_id:'module',required:true,
  title_en:source.manifest.title_en,title_fil:source.manifest.title_fil,
  objectives_en:source.manifest.objectives_en,objectives_fil:source.manifest.objectives_fil,revision
 }]};
 return render(<ReferenceLessons {...data as unknown as ReferenceData} modules={[]} locale={locale} initialLessonId="lesson-153-fixture" initialMode="slides" lessonBaseHref="/lessons" onResume={vi.fn().mockResolvedValue(undefined)} onComplete={vi.fn().mockResolvedValue(undefined)}/>);
}
describe('lesson 1.5.3 actual slide renderer',()=>{
 for(const locale of ['en','fil'] as const)it(`shows both relevant pictures on all six ${locale} slides, including the unanswered check`,()=>{
  view(locale);
  for(let i=0;i<6;i++){
   const images=screen.getAllByRole('img');
   for(const id of slides[i].asset_ids){
    const asset=source.assets.find((a:{id:string})=>a.id===id);
    expect(images.some(img=>img.getAttribute('alt')===asset[`alt_${locale}`])).toBe(true);
   }
   if(i<5)fireEvent.click(screen.getByRole('button',{name:locale==='en'?'Next':'Susunod'}));
  }
  expect(screen.getByRole('button',{name:source.sections.at(-1).check.options[0][locale]})).toBeInTheDocument();
 });
});
