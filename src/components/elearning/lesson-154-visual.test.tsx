import {cleanup,render,screen,fireEvent} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {ReferenceLessons,type ReferenceData} from './reference-lessons';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
describe('lesson 1.5.4 application image',()=>{
 it.each(['fil','en'])('shows the teamwork image before a %s application answer without revealing feedback',locale=>{
  const check={prompt_fil:'Ano ang gagawin?',prompt_en:'What will you do?',options:[{fil:'Magtanong',en:'Ask'},{fil:'Hulaan',en:'Guess'},{fil:'Manahimik',en:'Wait'}],correct_option_index:0,feedback_fil:'A ang angkop; B at C ay may kakulangan.',feedback_en:'A fits; B and C miss safeguards.'};
  const slide={id:'slide-teamwork-application-check',concept_ids:['m5.competency'],layout:'decision' as const,heading_fil:'Ilapat',heading_en:'Apply',display_fil:'Buod',display_en:'Summary',asset_ids:['malou-teamwork'],check};
  const lesson={id:'l',module_id:'m',lesson_key:'bhw-teamwork',position:3,required:true,title_fil:'Mabuting pagtutulungan',title_en:'Working well as a team',objectives_fil:['Layunin'],objectives_en:['Objective'],revision:{id:'r',lesson_id:'l',read_sections:[],slides:[slide],assets:[{id:'malou-teamwork',path:'/draft-teamwork.png',content_hash:'a'.repeat(64),alt_fil:'Malou at mga kasamahan',alt_en:'Malou and colleagues',caption_fil:'Kathang-isip',caption_en:'Fictional',review_status:'draft' as const,provenance:'Test fixture'}],sources:[]}} as unknown as ReferenceData['lessons'][number];
  render(<ReferenceLessons title_fil="Manual" title_en="Manual" chapters={[]} modules={[]} lessons={[lesson]} completed={[]} resumes={[]} initialLessonId="l" initialMode="slides" locale={locale} onResume={async()=>{}} onComplete={async()=>{}}/>);
  expect(screen.getByRole('img')).toHaveAttribute('src','/draft-teamwork.png');expect(screen.queryByText(check[locale==='en'?'feedback_en':'feedback_fil'])).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:locale==='en'?'Ask':'Magtanong'}));expect(screen.getByRole('img')).toBeInTheDocument();expect(screen.getByText(check[locale==='en'?'feedback_en':'feedback_fil'])).toBeInTheDocument();
 });
});
