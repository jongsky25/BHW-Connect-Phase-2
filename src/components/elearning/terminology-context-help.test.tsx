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
