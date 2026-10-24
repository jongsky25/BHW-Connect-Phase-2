import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {AiVisualLabel} from './ai-visual-label';
import {LessonAssetFigure} from './lesson-asset-figure';
import registry from '@/lib/elearning/ai-visual-registry.json';
import type {LessonAsset} from '@/lib/elearning/types';
import {ReferenceLessons, type ReferenceData} from './reference-lessons';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));

afterEach(cleanup);
const path = '/training/bhw-1-2/vlanche-ernesto-7e4e35141628.png';
const storyPath = '/training/bhw-1-2/uhc-purpose-vlanche-fil-2b094d54f279-poster.jpg';
const asset: LessonAsset = {id:'art',path,content_hash:registry[path].sha256,provenance:'Fixture',review_status:'approved',
  alt_en:'A fictional conversation',alt_fil:'Kathang-isip na pag-uusap',caption_en:'Original caption',caption_fil:'Orihinal na caption'};

it.each([true, false])('labels verified static art in its caption without replacing alternatives (en=%s)', en => {
  const {container} = render(<LessonAssetFigure asset={asset} en={en}/>);
  expect(container.querySelector('figcaption')).toHaveTextContent(en ? 'AI-generated illustration' : 'Ilustrasyong ginawa gamit ang AI');
  expect(screen.getByText(en ? 'Original caption' : 'Orihinal na caption', {exact:false})).toBeInTheDocument();
  expect(screen.getByRole('img')).toHaveAttribute('alt',en ? asset.alt_en : asset.alt_fil);
  expect(container.querySelector('[data-ai-visual-label]')).toHaveAttribute('lang',en ? 'en' : 'fil');
});
it.each([true, false])('describes verified story imagery without claiming the whole animation is AI-generated (en=%s)', en => {
  const [videoPath, hash] = Object.entries(registry[storyPath].videos)[en ? 0 : 1];
  const video = {path:videoPath,content_hash:hash,duration_s:60};
  const {container} = render(<LessonAssetFigure asset={{...asset,path:storyPath,content_hash:registry[storyPath].sha256,video}} en={en}/>);
  expect(container.querySelector('figcaption')).toHaveTextContent(en ? 'Includes AI-generated illustrations' : 'May mga ilustrasyong ginawa gamit ang AI');
  expect(container.querySelector('video')).toHaveAttribute('controls');
  expect(container.querySelector('video')).toHaveAttribute('preload','none');
  expect(container.querySelector('video')).not.toHaveAttribute('autoplay');
});
it.each([
  {path:'/training/code-authored.svg',contentHash:'x'},
  {path:'/photographs/actual-bhw.jpg',contentHash:'x'},
  {path:'constructor'},
  {path,contentHash:'changed'},
  {path:storyPath,contentHash:registry[storyPath].sha256,video:{path:'/tts-only.mp4',content_hash:'x'}},
])('does not infer visual provenance from unknown or changed media: $path', props => {
  const {container} = render(<AiVisualLabel {...props} en/>);
  expect(container).toBeEmptyDOMElement();
});

it.each([true,false])('labels the reported UHC story illustration in Read, Slides and fullscreen (en=%s)',en=>{
  const show = HTMLDialogElement.prototype.showModal;
  const close = HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  const part={id:'intro',concept_ids:['topic'],asset_ids:[],heading_en:'Example',heading_fil:'Halimbawa',body_en:'Example only',body_fil:'Halimbawa lamang',check:null};
  const data={title_fil:'Manual',title_en:'Manual',chapters:[],completed:[],resumes:[],lessons:[{id:'lesson',lesson_key:'uhc-coverage',module_id:'module',required:true,title_fil:'Aralin',title_en:'Lesson',objectives_fil:[],objectives_en:[],revision:{id:'revision',read_sections:[part],slides:[{...part,id:'slide-intro',layout:'scene',display_en:'Summary',display_fil:'Buod'}],assets:[],sources:[]}}]} as unknown as ReferenceData;
  try{
    const {container}=render(<ReferenceLessons {...data} modules={[]} locale={en?'en':'fil'} initialLessonId="lesson" readOnly onResume={vi.fn()} onComplete={vi.fn()}/>);
    const label=en?'AI-generated illustration':'Ilustrasyong ginawa gamit ang AI';
    expect(screen.getByText(label)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Slides'}));
    expect(screen.getByText(label)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:en?'Full screen':'Buong screen'}));
    expect(within(container.querySelector('dialog')!).getByText(label)).toBeInTheDocument();
  }finally{HTMLDialogElement.prototype.showModal=show;HTMLDialogElement.prototype.close=close;}
});
