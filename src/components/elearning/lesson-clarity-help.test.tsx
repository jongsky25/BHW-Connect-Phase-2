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
const coverage=lesson('02-uhc-act','uhc-coverage');
const safety=lesson('08-osh','safety-identify');
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
}

it('does not attach these notes to translated or future lesson revisions',()=>{
  show(coverage,'slide-included',false,true,true);
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
  cleanup();show({...safety,revision:{...safety.revision,content_hash:'future'}},'ana',false,false);
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
});
