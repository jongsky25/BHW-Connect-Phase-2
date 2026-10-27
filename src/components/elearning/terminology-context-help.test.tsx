import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {loadReferenceModule,contentHash} from '../../../scripts/lib/reference-content.mjs';
import {NarrationAccessGuide} from './narration-access-guide';
import type {PublishedLesson} from '@/lib/elearning/reference-navigation';

afterEach(cleanup);
const cases=[
  {module:'05-bhw-at-barangay',key:'bhw-barangay-partners',read:'section-5',slide:'slide-section-5',fil:'gampanin o tungkulin',en:'partner’s role'},
  {module:'04-ra7883',key:'bhw-legal-role',read:'status-and-other-processes',slide:'slide-status-and-other-processes',fil:'propesyonal na lisensiya',en:'professional licence'},
  {module:'01-tungkulin-ng-bhw',key:'bhw-records',read:'household-profile',slide:'household-profile-slide',fil:'mga puwang',en:'spaces for information'},
  {module:'03-polisiya-bhs',key:'bhs-resources',read:'section-5',slide:'slide-section-5',fil:'kuryente, tubig at suplay',en:'electricity, water and supplies'},
  {module:'03-polisiya-bhs',key:'bhs-support-environment',read:'facility-roles',slide:'slide-facility-roles',fil:'paglalaan at paghahanda',en:'arrange a lactation station'},
] as const;
for(const item of cases){
  const source=loadReferenceModule(`content/training/day1-basic-competencies/modules/${item.module}`,'public').lessons.find(l=>l.manifest.lesson_key===item.key)!;
  const lesson={...source.manifest,id:'lesson',revision:{...source.revision,id:'revision',content_hash:contentHash(source)}} as PublishedLesson;
  for(const en of [true,false]){
    it(`explains ${item.key} in ${en?'English':'Filipino'} only beside its published section`,()=>{
      render(<NarrationAccessGuide lesson={lesson} position={item.read} en={en} slides={false} translated={false} illustrated={false}/>);
      expect(screen.getByRole('note')).toHaveTextContent(en?item.en:item.fil);
      cleanup();
      render(<NarrationAccessGuide lesson={lesson} position={item.slide} en={en} slides={true} translated={false} illustrated={false}/>);
      if(item.key==='bhw-records')expect(screen.queryByRole('note')).not.toBeInTheDocument();
      else expect(screen.getByRole('note')).toHaveTextContent(en?item.en:item.fil);
      cleanup();
      render(<NarrationAccessGuide lesson={{...lesson,revision:{...lesson.revision,content_hash:'future'}}} position={item.read} en={en} slides={false} translated={false} illustrated={false}/>);
      expect(screen.queryByRole('note')).not.toBeInTheDocument();
    });
  }
}

const communicationSource=loadReferenceModule('content/training/day1-basic-competencies/modules/06-komunikasyon','public').lessons.find(l=>l.manifest.lesson_key==='communication-clarify')!;
const communication={...communicationSource.manifest,id:'lesson',revision:{...communicationSource.revision,id:'revision',content_hash:contentHash(communicationSource)}} as PublishedLesson;
for(const en of [true,false])for(const item of [
  {read:'open-question',slide:'slide-open-question',text:en?'not tomorrow':'hindi kinabukasan'},
  {read:'barriers',slide:'slide-barriers',text:en?'Rosario is a child':'si Rosario ay bata'},
])it(`explains communication ${item.read} in ${en?'English':'Filipino'} only for the reviewed revision`,()=>{
  for(const [position,slides] of [[item.read,false],[item.slide,true]] as const){
    render(<NarrationAccessGuide lesson={communication} position={position} en={en} slides={slides} translated={false} illustrated={false}/>);
    expect(screen.getByRole('note')).toHaveTextContent(item.text);
    cleanup();
  }
  render(<NarrationAccessGuide lesson={{...communication,revision:{...communication.revision,content_hash:'future'}}} position={item.read} en={en} slides={false} translated={false} illustrated={false}/>);
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
});
