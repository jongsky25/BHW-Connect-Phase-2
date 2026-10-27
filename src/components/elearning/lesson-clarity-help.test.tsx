import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {loadReferenceModule,contentHash} from '../../../scripts/lib/reference-content.mjs';
import type {PublishedLesson} from '@/lib/elearning/reference-navigation';
import {NarrationAccessGuide} from './narration-access-guide';

afterEach(cleanup);
function lesson(module:string,key:string){
  const source=loadReferenceModule(`content/training/day1-basic-competencies/modules/${module}`,'public').lessons.find(l=>l.manifest.lesson_key===key)!;
  return {...source.manifest,id:'lesson',revision:{...source.revision,id:'revision',content_hash:contentHash(source)}} as PublishedLesson;
}
function chapter2Lesson(module:string,key:string){
  const source=loadReferenceModule(`content/training/chapter2-common-competencies/drafts/${module}`,'public').lessons.find(l=>l.manifest.lesson_key===key)!;
  return {...source.manifest,id:'lesson',revision:{...source.revision,id:'revision',content_hash:contentHash(source)}} as PublishedLesson;
}
const coverage=lesson('02-uhc-act','uhc-coverage');
const safety=lesson('08-osh','safety-identify');
const safetyPrepare=lesson('08-osh','safety-prepare');
const safeChange=lesson('09-sustainable-practices','resources-safe-change');
const firstAidKit=chapter2Lesson('04-first-aid','first-aid-kit');
const hazards=chapter2Lesson('07-disaster-preparedness','hazards-capacities');
const show=(item:PublishedLesson,position:string,en:boolean,slides:boolean,translated=false)=>render(
  <NarrationAccessGuide lesson={item} position={position} en={en} slides={slides} translated={translated} illustrated={false}/>);

for(const en of [true,false]){
  it(`completes the UHC slide's meaning in ${en?'English':'Filipino'} without changing Read`,()=>{
    show(coverage,'slide-included',en,true);
    expect(screen.getByRole('note')).toHaveTextContent(en?'does not confirm that this consultation is free':'Hindi pa nito tiyak kung libre ang konsultang ito');
    cleanup();show(coverage,'included',en,false);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
  it(`defines the safety terms in ${en?'English':'Filipino'} Read and Slides`,()=>{
    show(safety,'ana',en,false);
    expect(screen.getByRole('note')).toHaveTextContent(en?'sharps box':'lalagyan ng gamit na karayom');
    expect(screen.getByRole('note')).toHaveTextContent(en?'do not handle the box contents':'huwag hawakan ang laman');
    cleanup();show(safety,'slide-ana',en,true);
    expect(screen.getByRole('note')).toHaveTextContent('fill line');
  });
  it(`names the route reporting contact in ${en?'English':'Filipino'} Read and Slides`,()=>{
    for(const [position,slides] of [['field-preparation',false],['slide-field-preparation',true]] as const){
      show(safetyPrepare,position,en,slides);
      expect(screen.getByRole('note')).toHaveTextContent(en?'locally designated reporting contact':'itinalagang reporting contact');
      expect(screen.getByRole('note')).toHaveTextContent(en?'confirm both with the supervisor':'tiyakin ang dalawa sa supervisor');
      cleanup();
    }
    show({...safetyPrepare,revision:{...safetyPrepare.revision,content_hash:'future'}},'field-preparation',en,false);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
  it(`identifies the practice case once at the opening of ${en?'English':'Filipino'} Read and Slides`,()=>{
    show(safeChange,'utilities',en,false);
    expect(screen.getByRole('note')).toHaveTextContent(en?'Practice case: Charlaine':'Kaso para sa pagsasanay: kathang-isip si Charlaine');
    cleanup();show(safeChange,'slide-utilities',en,true);
    expect(screen.getByRole('note')).toHaveTextContent(en?'sample records and choices':'sample na tala at pagpipilian');
    cleanup();show(safeChange,'slide-worked-example',en,true);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
  it(`explains the recurring Monday step in two Chapter II lessons (${en?'English':'Filipino'})`,()=>{
    for(const item of [firstAidKit,hazards])for(const [position,slides] of [['next-step',false],['slide-next-step',true]] as const){
      show(item,position,en,slides);
      expect(screen.getByRole('note')).toHaveTextContent(en?'not a deadline':'hindi takdang araw');
      cleanup();
    }
  });
}

it('does not attach these notes to translated or future lesson revisions',()=>{
  show(coverage,'slide-included',false,true,true);
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
  cleanup();show({...safety,revision:{...safety.revision,content_hash:'future'}},'ana',false,false);
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
  cleanup();show({...safeChange,revision:{...safeChange.revision,content_hash:'future'}},'slide-utilities',false,true);
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
  cleanup();show(firstAidKit,'slide-practice',false,true);
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
  cleanup();show({...firstAidKit,revision:{...firstAidKit.revision,slides:firstAidKit.revision.slides.map(slide=>slide.id==='slide-next-step'?{...slide,heading_en:'Next practice'}:slide)}},'slide-next-step',false,true);
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
});
