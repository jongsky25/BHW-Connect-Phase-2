import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {ReferenceLessons, type ReferenceData} from './reference-lessons';
import {LessonSectionOutline} from './lesson-section-outline';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(()=>vi.useRealTimers());
const check={prompt_en:'Choose an action',prompt_fil:'Pumili ng gagawin',options:[{en:'Ask the team',fil:'Magtanong sa team'},{en:'Guess',fil:'Hulaan'}],correct_option_index:0,feedback_en:'Check feedback',feedback_fil:'Puna sa sagot'};
const sections=['first','middle','last'].map((id,i)=>({id,concept_ids:[id],asset_ids:[],heading_en:`Heading ${id}`,heading_fil:`Pamagat ${id}`,body_en:`Full teaching ${id}`,body_fil:`Buong aralin ${id}`,takeaway_en:`Hidden takeaway ${id}`,takeaway_fil:`Nakatagong buod ${id}`,check:i===1?null:check}));
const data={title_en:'Manual',title_fil:'Manwal',chapters:[],completed:[],resumes:[],lessons:[{id:'lesson',lesson_key:'fixture',module_id:'module',required:true,title_en:'Lesson',title_fil:'Aralin',objectives_en:[],objectives_fil:[],revision:{id:'revision',read_sections:sections,slides:sections.map(s=>({...s,id:'slide-'+s.id,layout:'takeaway',display_en:s.body_en,display_fil:s.body_fil})),assets:[],sources:[]}}]} as unknown as ReferenceData;
function open(en:boolean){const label=en?'Sections in this lesson':'Mga bahagi ng araling ito';const summary=screen.getByText(new RegExp('^'+label+' ·'));fireEvent.click(summary);summary.closest('details')!.open=true;return within(screen.getByRole('navigation',{name:label}));}
for(const locale of ['en','fil'])for(const initialMode of ['read','slides'] as const){
 it(`jumps by heading without exposing answers or bypassing either check (${locale}, ${initialMode})`,async()=>{
  vi.useFakeTimers({shouldAdvanceTime:true});const resume=vi.fn().mockResolvedValue(undefined),complete=vi.fn();const en=locale==='en';
  render(<ReferenceLessons {...data} modules={[]} locale={locale} initialLessonId="lesson" initialMode={initialMode} onResume={resume} onComplete={complete}/>);
  const finish=()=>screen.getByRole('button',{name:en?'Mark lesson complete':'Markahang tapos ang aralin'});
  let nav=open(en);expect(nav.getAllByRole('button')).toHaveLength(3);
  expect(nav.getByRole('button',{name:/first/})).toHaveAttribute('aria-current','step');
  expect(screen.queryByText(en?'Hidden takeaway last':'Nakatagong buod last')).toBeNull();
  expect(resume).not.toHaveBeenCalled();
  fireEvent.click(nav.getByRole('button',{name:/last/}));expect(finish()).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:en?'Ask the team':'Magtanong sa team'}));expect(finish()).toBeDisabled();
  nav=open(en);fireEvent.click(nav.getByRole('button',{name:/first/}));
  fireEvent.click(screen.getByRole('button',{name:en?'Guess':'Hulaan'}));
  nav=open(en);fireEvent.click(nav.getByRole('button',{name:/last/}));
  expect(screen.getByRole('button',{name:en?'Ask the team':'Magtanong sa team'})).toHaveAttribute('aria-pressed','true');
  expect(finish()).toBeEnabled();expect(complete).not.toHaveBeenCalled();
  await act(()=>vi.advanceTimersByTimeAsync(3100));
  expect(resume).toHaveBeenCalledTimes(1);expect(resume).toHaveBeenCalledWith(expect.objectContaining({position_key:initialMode==='read'?'last':'slide-last',modality:initialMode,lesson_id:'lesson',revision_id:'revision'}));
 });
}
it('revisits the current section without issuing a resume write',async()=>{
 vi.useFakeTimers({shouldAdvanceTime:true});const resume=vi.fn();
 render(<ReferenceLessons {...data} modules={[]} locale="en" initialLessonId="lesson" onResume={resume} onComplete={vi.fn()}/>);
 fireEvent.click(open(true).getByRole('button',{name:/first/}));await act(()=>vi.advanceTimersByTimeAsync(3100));expect(resume).not.toHaveBeenCalled();
});
it('keeps read-only preview navigation free of saves and completion',async()=>{
 vi.useFakeTimers({shouldAdvanceTime:true});const resume=vi.fn(),complete=vi.fn();
 render(<ReferenceLessons {...data} modules={[]} locale="en" initialLessonId="lesson" readOnly onResume={resume} onComplete={complete}/>);
 fireEvent.click(open(true).getByRole('button',{name:/middle/}));await act(()=>vi.advanceTimersByTimeAsync(3100));
 expect(screen.getByRole('heading',{name:'Heading middle'})).toBeVisible();expect(resume).not.toHaveBeenCalled();expect(complete).not.toHaveBeenCalled();
});
it('keeps authored heading language separate from the bilingual controls',()=>{
 render(<LessonSectionOutline items={sections} currentId="first" en language="ceb" onSelect={vi.fn()}/>);
 expect(screen.getByText('Heading first')).toHaveAttribute('lang','ceb');expect(screen.getByText(/Sections in this lesson/).closest('details')).toHaveAttribute('lang','en');
});
it('omits an empty, one-section or unknown-position outline',()=>{
 const props={items:sections,currentId:'missing',en:true,onSelect:vi.fn()};
 const {container,rerender}=render(<LessonSectionOutline {...props}/>);expect(container).toBeEmptyDOMElement();
 rerender(<LessonSectionOutline {...props} items={sections.slice(0,1)} currentId="first"/>);expect(container).toBeEmptyDOMElement();
});
