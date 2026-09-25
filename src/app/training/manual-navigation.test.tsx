import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import TrainingPage from './[programId]/[[...path]]/page';
import Catalog from '../courses/page';

const state=vi.hoisted(()=>({failing:'',role:'bhw',status:'certified',locale:'en',calls:[] as Array<{table:string;columns?:string;filters:Array<[string,unknown]>}>,rows:{} as Record<string,Array<Record<string,unknown>>>}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error('REDIRECT '+url)},notFound:()=>{throw new Error('NOT_FOUND')},useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock('next-intl/server',()=>({getLocale:async()=>state.locale,getTranslations:async()=>((key:string)=>key)}));
vi.mock('@/lib/flags/get-flags',()=>({getFeatureFlags:async()=>({elearning:true,course_sessions:true})}));
vi.mock('@/lib/supabase/app-user',()=>({getAppUser:async()=>({id:'self',role:state.role,status:'active'})}));
vi.mock('@/components/elearning/manual-lesson',()=>({ManualLesson:({readOnly,nextLessonHref}:{readOnly:boolean;nextLessonHref?:string})=><div data-next-lesson={nextLessonHref}>{readOnly?'Admin preview':'Learner lesson'}</div>}));
vi.mock('@sentry/nextjs',()=>({captureException:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'auth'}}})},from:(table:string)=>{
  const call={table,columns:'',filters:[] as Array<[string,unknown]>};state.calls.push(call);
  let single=false;
  const q={select:(c:string)=>{call.columns=c;return q},eq:(k:string,v:unknown)=>{call.filters.push([k,v]);return q},in:()=>q,not:()=>q,order:()=>q,limit:()=>q,returns:()=>q,
    maybeSingle:()=>{single=true;return q},single:()=>{single=true;return q},then:(resolve:(v:unknown)=>void)=>{
      let rows=state.rows[table]??[];
      rows=rows.filter(r=>call.filters.every(([k,v])=>r[k]===v));
      if(table===state.failing)return resolve({data:null,error:{message:'boom'}});
      resolve({data:single?rows[0]??null:rows,error:null});
    }};return q;
}})}));

beforeEach(()=>{
  state.failing='';state.role='bhw';state.locale='en';state.calls=[];
  state.rows={
    training_programs:[{id:'manual',content_key:'bhw-reference-manual',status:'published',title_en:'Manual',title_fil:'Manwal'}],
    training_program_chapters:[{id:'ch1',program_id:'manual',chapter_key:'chapter-1',position:0,availability:'available',course_id:'course',title_en:'BHWs and Their Barangay',title_fil:'Ang BHW at Barangay'},
      {id:'ch2',program_id:'manual',chapter_key:'chapter-2',position:1,availability:'unavailable',course_id:null,title_en:'First Responders',title_fil:'First Responders'}],
    courses:[{id:'course',status:'published',title_en:'Old Araw 1',title_fil:'Lumang Araw 1'},{id:'generic',status:'published',title_en:'Other course',title_fil:'Ibang kurso'}],
    course_modules:[{id:'m1',course_id:'course',position:0,type:'text',title_en:'Roles',title_fil:'Tungkulin'},{id:'m2',course_id:'course',position:1,type:'text',title_en:'UHC',title_fil:'UHC'}],
    course_lessons:[{id:'l1',module_id:'m1',position:0,required:true,title_en:'HEPO',title_fil:'HEPO',published_revision_id:'r1'},{id:'l2',module_id:'m1',position:1,required:true,title_en:'Educator',title_fil:'Tagapagturo',published_revision_id:'r2'}],
    course_progress:[{id:'someone',course_id:'course',bhw_user_id:'other',status:'certified'},{id:'mine',course_id:'course',bhw_user_id:'self',status:'certified'}],
    certificates:[{course_id:'course',bhw_user_id:'other',verification_code:'NOT-MINE'},{course_id:'course',bhw_user_id:'self',verification_code:'MY-CERT'}],
    course_lesson_progress:[],course_lesson_resume:[],course_lesson_revisions:[{id:'r1'}],course_test_questions_current:[{id:'q',course_id:'course'}],course_test_attempts:[],
  };
});
afterEach(cleanup);
const page=(path:string[]=[],view?:string)=>TrainingPage({params:Promise.resolve({programId:'manual',path}),searchParams:Promise.resolve({view})});
const guideTables=['course_lesson_facilitator_notes','course_module_facilitator_notes','competency_observations','users'];
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
    expect(screen.getByText('Learner lesson')).toHaveAttribute('data-next-lesson','/training/manual/chapter-1/m1/l2');
    expect(state.calls.some(c=>c.table==='course_lesson_facilitator_notes')).toBe(false);
  });
  it('admin sees preview and never someone else’s certificate',async()=>{
    state.role='admin';render(await page(['chapter-1','m1','l1'],'lesson'));expect(screen.getByText('Admin preview')).toBeInTheDocument();
    expect(state.calls.find(c=>c.table==='course_progress')?.filters).toContainEqual(['bhw_user_id','self']);
  });
  it('facilitator lesson opens on the guide, with a tab for the BHW view',async()=>{
    state.role='assessor';
    state.rows.course_lesson_facilitator_notes=[{revision_id:'r1',notes_en:'## [purpose] Purpose\n\nTeach **HEPO**.\n\n## [steps] Steps\n\n1. Ask first.\n2. Then explain.',notes_fil:'',
      observation_indicators:[{objective_index:0,observable_fil:'',observable_en:'Explains HEPO',not_yet_fil:'',not_yet_en:'Cannot yet explain',
        levels:{kaya_na_fil:'',kaya_na_en:'Unprompted',kailangan_practice_fil:'',kailangan_practice_en:'With prompts',hindi_pa_fil:'',hindi_pa_en:'Needs demo'}}]}];
    render(await page(['chapter-1','m1','l1']));
    expect(screen.getByRole('heading',{name:'Facilitator guide for this lesson'})).toBeInTheDocument();
    expect(screen.getByText('HEPO',{selector:'strong'})).toBeInTheDocument();
    expect(screen.getByText('Ask first.')).toBeInTheDocument();
    expect(screen.getByText(/Explains HEPO/)).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'As the BHW sees it'})).toHaveAttribute('href','/training/manual/chapter-1/m1/l1?view=lesson');
    expect(screen.queryByText('Admin preview')).not.toBeInTheDocument();
  });
  it('facilitator subchapter shows what BHWs learn, the competency and every BHW with progress',async()=>{
    state.role='assessor';
    state.rows.course_modules[0].objectives_en=['Explain the three roles'];
    state.rows.course_lesson_revisions=[{id:'r1',read_sections:[{takeaway_en:'HEPO is the umbrella',takeaway_fil:''}]}];
    state.rows.course_module_facilitator_notes=[{module_id:'m1',notes_en:'| Part | Time |\n|---|---|\n| Opening | 30 min |',notes_fil:'',competency_statement_en:'Participate in workplace communication',competency_statement_fil:'',
      observation_indicators:[{objective_index:0,observable_fil:'',observable_en:'Names all three roles',not_yet_fil:'',not_yet_en:'Lists only services',
        levels:{kaya_na_fil:'',kaya_na_en:'a',kailangan_practice_fil:'',kailangan_practice_en:'b',hindi_pa_fil:'',hindi_pa_en:'c'}}]}];
    state.rows.users=[{id:'b1',full_name:'Rosa Cruz',role:'bhw',status:'active',org_units:{name:'Barangay Uno'}},{id:'b2',full_name:'Lito Reyes',role:'bhw',status:'active',org_units:null}];
    state.rows.course_progress=[{id:'p1',course_id:'course',bhw_user_id:'b1',status:'in_progress',course_lesson_progress:[{lesson_id:'l1'}]}];
    state.rows.course_test_attempts=[{course_id:'course',bhw_user_id:'b1',phase:'pretest',score_percent:60,taken_at:'2026-09-01'}];
    state.rows.competency_observations=[{id:'o1',bhw_user_id:'b1',observer_user_id:'self',module_id:'m1',objective_index:0,level:'kaya_na',note:'',observed_at:'2026-09-02T00:00:00Z'}];
    render(await page(['chapter-1','m1']));
    expect(screen.getByRole('heading',{name:'Facilitator guide'})).toBeInTheDocument();
    expect(screen.getByText('HEPO is the umbrella')).toBeInTheDocument();
    expect(screen.getByText('Participate in workplace communication')).toBeInTheDocument();
    expect(screen.getByRole('cell',{name:'30 min'})).toBeInTheDocument();
    expect(screen.getByText('Rosa Cruz')).toBeInTheDocument();expect(screen.getByText('Lito Reyes')).toBeInTheDocument();
    expect(screen.getByText(/Lessons: 1\/2 · Pretest: 60%/)).toBeInTheDocument();
    expect(screen.getByText(/Ind\. 1: Kaya na/)).toBeInTheDocument();
    expect(screen.getAllByRole('button',{name:'Record observation'})).toHaveLength(2);
  });
  it('facilitator chapter page shows where BHWs in the area struggle',async()=>{
    state.role='assessor';
    state.rows.course_test_questions_current=[{id:'q',course_id:'course',position:0,prompt_en:'Who accredits a BHW?',prompt_fil:'',correct_option_index:0,options:[{en:'Local health board',fil:''},{en:'The midwife',fil:''}]}];
    state.rows.course_test_attempts=[{course_id:'course',bhw_user_id:'b1',phase:'pretest',taken_at:'2026-09-01',answers:[{question_id:'q',selected_option_index:1}]},
      {course_id:'course',bhw_user_id:'b2',phase:'pretest',taken_at:'2026-09-01',answers:[{question_id:'q',selected_option_index:0}]}];
    render(await page(['chapter-1']));
    expect(screen.getByRole('heading',{name:'Where BHWs in your area struggle'})).toBeInTheDocument();
    expect(screen.getByText(/Pretest: 50% correct \(1\/2\)/)).toBeInTheDocument();
    expect(screen.getByText('The midwife')).toBeInTheDocument();
  });
  it('learners and designers never load facilitator-only data',async()=>{
    for(const role of ['bhw','designer']){
      state.role=role;state.calls=[];
      render(await page(['chapter-1']));expect(screen.queryByText('Where BHWs in your area struggle')).not.toBeInTheDocument();cleanup();
      render(await page(['chapter-1','m1']));cleanup();
      render(await page(['chapter-1','m1','l1'],'lesson'));cleanup();
      expect(state.calls.filter(c=>guideTables.includes(c.table))).toEqual([]);
      expect(screen.queryByText('Facilitator guide')).not.toBeInTheDocument();
    }
  });
  it('new learners must complete pretest before entering a lesson',async()=>{
    state.rows.course_progress=[];await expect(page(['chapter-1','m1','l1'])).rejects.toThrow('REDIRECT /courses/course?assessment=1');
  });
  it('rejects unavailable chapters and mismatched lesson URLs',async()=>{
    await expect(page(['chapter-2'])).rejects.toThrow('NOT_FOUND');await expect(page(['chapter-1','m2','l1'])).rejects.toThrow('NOT_FOUND');
  });
  it('manual overview shows the learner ring, chapter bar and continue link',async()=>{
    state.rows.course_progress=[{id:'mine',course_id:'course',bhw_user_id:'self',status:'in_progress'}];
    state.rows.course_test_attempts=[{course_id:'course',bhw_user_id:'self',phase:'pretest'}];
    state.rows.course_lesson_progress=[{course_progress_id:'mine',lesson_id:'l1'}];
    render(await page());
    expect(screen.getByRole('progressbar',{name:'Overall progress in BHW Reference Manual'})).toHaveAttribute('aria-valuenow','50');
    expect(screen.getByText('1 of 2 lessons done')).toBeInTheDocument();
    expect(screen.getByRole('progressbar',{name:'Chapter 1 progress'})).toHaveAttribute('aria-valuetext','1/2 lessons · 50%');
    expect(screen.getByRole('link',{name:/Continue where you left off/})).toHaveAttribute('href','/training/manual/chapter-1/m1/l2');
    expect(screen.getByText('Not yet available')).toBeInTheDocument();
  });
  it('chapter shows the step tracker and a bar per subchapter with lessons',async()=>{
    state.rows.course_progress=[{id:'mine',course_id:'course',bhw_user_id:'self',status:'in_progress'}];
    state.rows.certificates=[];
    state.rows.course_test_attempts=[{course_id:'course',bhw_user_id:'self',phase:'pretest'}];
    render(await page(['chapter-1']));
    const steps=screen.getAllByRole('listitem').filter(li=>li.hasAttribute('data-state'));
    expect(steps.map(li=>li.getAttribute('data-state'))).toEqual(['done','current','todo','todo']);
    expect(screen.getByRole('progressbar',{name:'1.1 progress'})).toHaveAttribute('aria-valuetext','0/2 lessons · 0%');
    expect(screen.queryByRole('progressbar',{name:'1.2 progress'})).not.toBeInTheDocument();
    expect(screen.getByText(/Short lessons are being prepared/)).toBeInTheDocument();
  });
  it('subchapter marks each lesson done, started or not started',async()=>{
    state.rows.course_lesson_progress=[{course_progress_id:'mine',lesson_id:'l1'}];
    render(await page(['chapter-1','m1']));
    expect(screen.getByRole('progressbar',{name:'Progress in Roles'})).toHaveAttribute('aria-valuenow','50');
    expect(screen.getByRole('link',{name:/HEPO/})).toHaveTextContent(/Lesson 1 of 2 · Read \/ Slides.*Completed/);
    expect(screen.getByRole('link',{name:/Educator/})).toHaveTextContent('Not started');
  });
  it('admins get the preview with no personal progress loaded',async()=>{
    state.role='admin';render(await page());
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(state.calls.some(c=>c.table==='course_lesson_resume')).toBe(false);
  });
  it('a progress load failure hides progress but keeps the manual',async()=>{
    state.failing='course_test_attempts';render(await page(['chapter-1']));
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('link',{name:/1.1 Roles/})).toHaveTextContent('2 short lessons');
  });
  it('renders Filipino chapter and preparation labels',async()=>{
    state.locale='fil';render(await page(['chapter-1']));expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Kabanata 1');
    expect(screen.getByText(/Inihahanda ang maiikling aralin/)).toBeInTheDocument();
  });
});
