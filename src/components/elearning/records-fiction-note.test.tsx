import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {loadReferenceModule,contentHash} from '../../../scripts/lib/reference-content.mjs';
import manifest from '../../../content/training/day1-basic-competencies/narration.json';
import {narrationForLesson,type ReferenceNarrationManifest} from '@/lib/elearning/reference-narration';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
const source=loadReferenceModule('content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw','public').lessons.find(l=>l.manifest.lesson_key==='bhw-records')!;
const lesson={...source.manifest,id:'lesson',revision:{...source.revision,id:'revision',content_hash:contentHash(source)}} as ReferenceData['lessons'][number];
const base={title_en:'Manual',title_fil:'Manual',chapters:[],modules:[],completed:[],resumes:[],readOnly:true,onResume:vi.fn(),onComplete:vi.fn()};

for(const locale of ['en','fil'] as const){
  it(`sets the fictional-record disclaimer apart in ${locale} Read`,()=>{
    const narration=narrationForLesson(manifest as ReferenceNarrationManifest,lesson.lesson_key,locale,lesson.revision.read_sections);
    render(<ReferenceLessons {...base} lessons={[lesson]} narration={{lesson:narration}} locale={locale} initialLessonId="lesson" initialMode="read"/>);
    const sentence=locale==='en'?'Every example in this lesson is fictional; it contains no real personal data or official form.':'Ang lahat ng halimbawa sa araling ito ay kathang-isip; wala itong tunay na personal na datos o opisyal na form.';
    expect(screen.getByRole('note')).toHaveTextContent(sentence);
    expect(screen.getAllByText(sentence)).toHaveLength(1);
    expect(screen.getByRole('group',{name:locale==='en'?'Listen to this section':'Pakinggan ang bahaging ito'})).toBeInTheDocument();
  });
  it(`leaves a changed ${locale} paragraph intact`,()=>{
    const future={...lesson,revision:{...lesson.revision,content_hash:'future',read_sections:lesson.revision.read_sections.map(section=>section.id==='record-purpose'?{
      ...section,body_en:section.body_en.replace('She has a fictional note','She has a practice note'),body_fil:section.body_fil.replace('May kathang-isip siyang tala','May tala siyang pangsanay'),
    }:section)}};
    render(<ReferenceLessons {...base} lessons={[future]} locale={locale} initialLessonId="lesson" initialMode="read"/>);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.getByText(/Every example in this lesson is fictional|Ang lahat ng halimbawa sa araling ito ay kathang-isip/)).toBeInTheDocument();
  });
}
