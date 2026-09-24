import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import TrainingPage from './[programId]/[[...path]]/page';
import Catalog from '../courses/page';

const state=vi.hoisted(()=>({role:'bhw',status:'certified',locale:'en',calls:[] as Array<{table:string;columns?:string;filters:Array<[string,unknown]>}>,rows:{} as Record<string,Array<Record<string,unknown>>>}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error('REDIRECT '+url)},notFound:()=>{throw new Error('NOT_FOUND')},useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock('next-intl/server',()=>({getLocale:async()=>state.locale,getTranslations:async()=>((key:string)=>key)}));
vi.mock('@/lib/flags/get-flags',()=>({getFeatureFlags:async()=>({elearning:true,course_sessions:true})}));
vi.mock('@/lib/supabase/app-user',()=>({getAppUser:async()=>({id:'self',role:state.role,status:'active'})}));
vi.mock('@/components/elearning/manual-lesson',()=>({ManualLesson:({readOnly}:{readOnly:boolean})=><div>{readOnly?'Admin preview':'Learner lesson'}</div>}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'auth'}}})},from:(table:string)=>{
  const call={table,columns:'',filters:[] as Array<[string,unknown]>};state.calls.push(call);
  let single=false;
  const q={select:(c:string)=>{call.columns=c;return q},eq:(k:string,v:unknown)=>{call.filters.push([k,v]);return q},in:()=>q,not:()=>q,order:()=>q,limit:()=>q,returns:()=>q,
    maybeSingle:()=>{single=true;return q},single:()=>{single=true;return q},then:(resolve:(v:unknown)=>void)=>{
      let rows=state.rows[table]??[];
      rows=rows.filter(r=>call.filters.every(([k,v])=>r[k]===v));
      resolve({data:single?rows[0]??null:rows,error:null});
    }};return q;
}})}));

beforeEach(()=>{
  state.role='bhw';state.locale='en';state.calls=[];
  state.rows={
    training_programs:[{id:'manual',content_key:'bhw-reference-manual',status:'published',title_en:'Manual',title_fil:'Manwal'}],
    training_program_chapters:[{id:'ch1',program_id:'manual',chapter_key:'chapter-1',position:0,availability:'available',course_id:'course',title_en:'BHWs and Their Barangay',title_fil:'Ang BHW at Barangay'},
      {id:'ch2',program_id:'manual',chapter_key:'chapter-2',position:1,availability:'unavailable',course_id:null,title_en:'First Responders',title_fil:'First Responders'}],
    courses:[{id:'course',status:'published',title_en:'Old Araw 1',title_fil:'Lumang Araw 1'},{id:'generic',status:'published',title_en:'Other course',title_fil:'Ibang kurso'}],
    course_modules:[{id:'m1',course_id:'course',position:0,type:'text',title_en:'Roles',title_fil:'Tungkulin'},{id:'m2',course_id:'course',position:1,type:'text',title_en:'UHC',title_fil:'UHC'}],
    course_lessons:[{id:'l1',module_id:'m1',position:0,title_en:'HEPO',title_fil:'HEPO',published_revision_id:'r1'},{id:'l2',module_id:'m1',position:1,title_en:'Educator',title_fil:'Tagapagturo',published_revision_id:'r2'}],
    course_progress:[{id:'someone',course_id:'course',bhw_user_id:'other',status:'certified'},{id:'mine',course_id:'course',bhw_user_id:'self',status:'certified'}],
    certificates:[{course_id:'course',bhw_user_id:'other',verification_code:'NOT-MINE'},{course_id:'course',bhw_user_id:'self',verification_code:'MY-CERT'}],
    course_lesson_progress:[],course_lesson_resume:[],course_lesson_revisions:[{id:'r1'}],course_test_questions:[{id:'q',course_id:'course'}],course_test_attempts:[],
  };
});
afterEach(cleanup);
const page=(path:string[]=[])=>TrainingPage({params:Promise.resolve({programId:'manual',path})});
describe('manual navigation',()=>{
  it('catalog replaces only the mapped course with the manual',async()=>{
    render(await Catalog());expect(screen.getByRole('link',{name:/BHW Reference Manual/})).toHaveAttribute('href','/training/manual');
    expect(screen.queryByText('Old Araw 1')).not.toBeInTheDocument();expect(screen.getByText('Other course')).toBeInTheDocument();
  });
  it('manual opens chapters, with unavailable chapters not linked',async()=>{
    render(await page());expect(screen.getByRole('link',{name:/BHWs and Their Barangay/})).toHaveAttribute('href','/training/manual/chapter-1');
    expect(screen.queryByRole('link',{name:/First Responders/})).not.toBeInTheDocument();expect(screen.queryByText('Roles')).not.toBeInTheDocument();
  });
  it('chapter shows subchapters and only the actor certificate; never long content',async()=>{
    render(await page(['chapter-1']));expect(screen.getByRole('link',{name:/1.1 Roles/})).toHaveAttribute('href','/training/manual/chapter-1/m1');
    expect(screen.getByRole('link',{name:'View certificate'})).toHaveAttribute('href','/certificates/MY-CERT');
    expect(state.calls.find(c=>c.table==='course_modules')?.columns).not.toMatch(/body|lesson/);
    expect(screen.getByText(/Short lessons are being prepared/)).toBeInTheDocument();
  });
  it('subchapter contains only its lesson links',async()=>{
    render(await page(['chapter-1','m1']));expect(screen.getByRole('link',{name:/1. HEPO/})).toHaveAttribute('href','/training/manual/chapter-1/m1/l1');
    expect(screen.queryByText('Learner lesson')).not.toBeInTheDocument();
  });
  it('lesson has a stable URL, sibling link, and excludes other subchapter bodies',async()=>{
    render(await page(['chapter-1','m1','l1']));expect(screen.getByText('Learner lesson')).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Next lesson →'})).toHaveAttribute('href','/training/manual/chapter-1/m1/l2');
    expect(state.calls.some(c=>c.table==='course_lesson_facilitator_notes')).toBe(false);
  });
  it('admin sees preview and never someone else’s certificate',async()=>{
    state.role='admin';render(await page(['chapter-1','m1','l1']));expect(screen.getByText('Admin preview')).toBeInTheDocument();
    expect(state.calls.find(c=>c.table==='course_progress')?.filters).toContainEqual(['bhw_user_id','self']);
  });
  it('new learners must complete pretest before entering a lesson',async()=>{
    state.rows.course_progress=[];await expect(page(['chapter-1','m1','l1'])).rejects.toThrow('REDIRECT /courses/course?assessment=1');
  });
  it('rejects unavailable chapters and mismatched lesson URLs',async()=>{
    await expect(page(['chapter-2'])).rejects.toThrow('NOT_FOUND');await expect(page(['chapter-1','m2','l1'])).rejects.toThrow('NOT_FOUND');
  });
  it('renders Filipino chapter and preparation labels',async()=>{
    state.locale='fil';render(await page(['chapter-1']));expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Kabanata 1');
    expect(screen.getByText(/Inihahanda ang maiikling aralin/)).toBeInTheDocument();
  });
});
