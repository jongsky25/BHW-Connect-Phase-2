import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import TrainingPage from './[programId]/[[...path]]/page';
import Catalog from '../courses/page';
import activityCards from '../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/activities.json';

const state=vi.hoisted(()=>({failing:'',role:'bhw',preview:false,v2:false,status:'certified',locale:'en',calls:[] as Array<{table:string;columns?:string;filters:Array<[string,unknown]>}>,rpcCalls:[] as string[],rows:{} as Record<string,Array<Record<string,unknown>>>}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error('REDIRECT '+url)},notFound:()=>{throw new Error('NOT_FOUND')},useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock('@/lib/assessor/load-rollout',()=>({loadAssessorRollout:async()=>({uiVisible:false})}));
vi.mock('next-intl/server',()=>({getLocale:async()=>state.locale,getTranslations:async()=>((key:string)=>key)}));
vi.mock('@/lib/flags/get-flags',()=>({getFeatureFlags:async()=>({elearning:true,course_sessions:true,chapter1_assessment_v2:state.v2})}));
vi.mock('@/lib/supabase/app-user',()=>({getAppUser:async()=>({id:'self',role:state.role,status:'active'}),forwardedAppUser:()=>null,APP_USER_HEADER:'x-app-user',APP_FLAGS_HEADER:'x-app-flags'}));
vi.mock('next/headers',()=>({headers:async()=>new Headers(state.preview?{'x-app-preview':'1','x-app-effective-role':'bhw'}:{}),cookies:async()=>({get:()=>undefined,getAll:()=>[]})}));
vi.mock('@/components/elearning/manual-lesson',()=>({ManualLesson:({storyQuestionHandoff,readOnly,nextLessonHref,returnHref}:{storyQuestionHandoff?:boolean;readOnly:boolean;nextLessonHref?:string;returnHref?:string})=><div data-story-handoff={String(storyQuestionHandoff)} data-next-lesson={nextLessonHref} data-return-href={returnHref}>{readOnly?'Admin preview':'Learner lesson'}</div>}));
vi.mock('@sentry/nextjs',()=>({captureException:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'auth'}}}),getClaims:async()=>({data:{claims:{sub:'auth'}}})},rpc:async(name:string)=>{state.rpcCalls.push(name);return {data:name==='rpc_learner_assessment_state'?{attempts:[],final_attempts:[]}:
  [...new Set((state.rows.course_test_questions_current??[]).map(row=>row.course_id))].map(course_id=>({course_id})),error:state.preview && name==='rpc_learner_assessment_state'?{message:'BHW-only RPC'}:null}},from:(table:string)=>{
  const call={table,columns:'',filters:[] as Array<[string,unknown]>};state.calls.push(call);
  let single=false;
  const nonNull:string[]=[];
  const q={select:(c:string)=>{call.columns=c;return q},eq:(k:string,v:unknown)=>{call.filters.push([k,v]);return q},is:(k:string,v:unknown)=>{call.filters.push([k,v]);return q},in:()=>q,not:(k:string,_op:string,v:unknown)=>{if(v===null)nonNull.push(k);return q},order:()=>q,limit:()=>q,returns:()=>q,
    maybeSingle:()=>{single=true;return q},single:()=>{single=true;return q},then:(resolve:(v:unknown)=>void)=>{
      let rows=state.rows[table]??[];
      rows=rows.filter(r=>call.filters.every(([k,v])=>r[k]===v)&&nonNull.every(k=>r[k]!=null));
      if(table===state.failing)return resolve({data:null,error:{message:'boom'}});
      resolve({data:single?rows[0]??null:rows,error:null});
    }};return q;
}})}));

beforeEach(()=>{
  state.failing='';state.role='bhw';state.preview=false;state.v2=false;state.locale='en';state.calls=[];state.rpcCalls=[];
  state.rows={
    training_programs:[{id:'manual',content_key:'bhw-reference-manual',status:'published',title_en:'Manual',title_fil:'Manwal'}],
    training_program_chapters:[{id:'ch1',program_id:'manual',chapter_key:'chapter-1',position:0,availability:'available',course_id:'course',title_en:'BHWs and Their Barangay',title_fil:'Ang BHW at Barangay'},
      {id:'ch2',program_id:'manual',chapter_key:'chapter-2',position:1,availability:'unavailable',course_id:null,title_en:'First Responders',title_fil:'First Responders'}],
    courses:[{id:'course',status:'published',title_en:'Old Araw 1',title_fil:'Lumang Araw 1',hidden_at:null,archived_at:null},{id:'generic',status:'published',title_en:'Other course',title_fil:'Ibang kurso',hidden_at:null,archived_at:null}],
    course_modules:[{id:'m1',course_id:'course',position:0,type:'text',title_en:'Roles',title_fil:'Tungkulin'},{id:'m2',course_id:'course',position:1,type:'text',title_en:'UHC',title_fil:'UHC'}],
    course_lessons:[{id:'l1',module_id:'m1',position:0,required:true,title_en:'HEPO',title_fil:'HEPO',published_revision_id:'r1'},{id:'l2',module_id:'m1',position:1,required:true,title_en:'Educator',title_fil:'Tagapagturo',published_revision_id:'r2'}],
    course_progress:[{id:'someone',course_id:'course',bhw_user_id:'other',status:'certified'},{id:'mine',course_id:'course',bhw_user_id:'self',status:'certified'}],
    certificates:[{course_id:'course',bhw_user_id:'other',verification_code:'NOT-MINE'},{course_id:'course',bhw_user_id:'self',verification_code:'MY-CERT'}],
    course_lesson_progress:[],course_lesson_resume:[],course_lesson_revisions:[{id:'r1'}],course_test_questions_current:[{id:'q',course_id:'course'}],course_test_attempts:[],
  };
});
afterEach(cleanup);
const page=(path:string[]=[],view?:string,returnTo?:string,mode?:string)=>TrainingPage({params:Promise.resolve({programId:'manual',path}),searchParams:Promise.resolve({view,returnTo,mode})});
const guideTables=['course_lesson_facilitator_notes','course_module_facilitator_notes','competency_observations','users'];
describe('manual navigation',()=>{
  it.each(['en','fil'])('explains guide access without granting preparation credit on the reported subchapter shape (%s)',async locale=>{
    state.role='assessor';state.locale=locale;
    render(await page(['chapter-1','m1']));
    expect(screen.getByRole('heading',{name:locale==='en'?'Guide access and assessment eligibility':'Pagbukas ng gabay at pahintulot sa pagtatasa'})).toBeInTheDocument();
    expect(screen.getByRole('link',{name:locale==='en'?'Open my chapter preparation':'Buksan ang sarili kong paghahanda sa kabanata'})).toHaveAttribute('href','/training/manual/assessor/chapter-1');
    expect(screen.getByRole('link',{name:locale==='en'?'Check my certification requirements':'Tingnan ang mga kailangan sa aking sertipikasyon'})).toHaveAttribute('href','/training/manual/assessor/qualifications#chapter-1');
    expect(screen.getByText(locale==='en'?/Reading it does not save/:/Hindi nito sine-save/)).toBeInTheDocument();
    expect(state.rpcCalls.every(name=>name==='rpc_learner_assessment_state')).toBe(true);
  });
  it.each(['chapter-2','chapter-3'])('keeps guide requirements in %s without inventing personal study support',async chapterKey=>{
    state.role='assessor';state.rows.training_program_chapters[0].chapter_key=chapterKey;
    render(await page([chapterKey,'m1']));
    expect(screen.getByRole('link',{name:'Check my certification requirements'})).toHaveAttribute('href',`/training/manual/assessor/qualifications#${chapterKey}`);
    const study=screen.queryByRole('link',{name:'Open my chapter preparation'});
    if(chapterKey==='chapter-2')expect(study).toHaveAttribute('href','/training/manual/assessor/chapter-2');
    else expect(study).not.toBeInTheDocument();
  });
  it.each(['bhw','admin','preview'])('does not show assessor preparation guidance to %s',async role=>{
    state.role=role==='preview'?'admin':role;state.preview=role==='preview';
    render(await page(['chapter-1','m1']));
    expect(screen.queryByRole('heading',{name:'Guide access and assessment eligibility'})).not.toBeInTheDocument();
  });
  it.each(['en','fil'])('shows visible published chapter/subchapter context on lessons (%s)',async(locale)=>{
    state.locale=locale;render(await page(['chapter-1','m1','l1']));
    const heading=screen.getByRole('heading',{level:1,name:'HEPO'}).closest('header')!;
    expect(heading).toHaveTextContent(locale==='en'?'Chapter 1':'Kabanata 1');
    expect(heading).toHaveTextContent(locale==='en'?'Subchapter: Roles':'Bahagi ng kabanata: Tungkulin');
    expect(heading.querySelector('a[href="/training/manual/chapter-1"]')).not.toBeNull();
    expect(heading.querySelector('a[href="/training/manual/chapter-1/m1"]')).not.toBeNull();
    expect(screen.getAllByRole('heading',{level:1})).toHaveLength(1);
  });

  it('facilitator lesson shows only activity cards mapped to its lesson key',async()=>{
    state.role='assessor';
    state.rows.course_lessons[0].lesson_key='bhw-roles-application';
    state.rows.course_module_facilitator_notes=[{module_id:'m1',activities:[activityCards[0],{...activityCards[0],id:'other',title:{en:'Other activity',fil:'Iba'},lesson_keys:['different-lesson']}]}];
    render(await page(['chapter-1','m1','l1']));
    expect(screen.getByRole('heading',{name:activityCards[0].title.en})).toBeInTheDocument();
    expect(screen.queryByRole('heading',{name:'Other activity'})).not.toBeInTheDocument();
  });
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
  it('keeps the story handoff disabled outside Chapter 1',async()=>{
    state.rows.training_program_chapters[0].chapter_key='chapter-2';
    render(await page(['chapter-2','m1','l1']));
    expect(screen.getByText('Learner lesson')).toHaveAttribute('data-story-handoff','false');
  });
  it('lesson has a stable URL, sibling link, and excludes other subchapter bodies',async()=>{
    render(await page(['chapter-1','m1','l1']));expect(screen.getByText('Learner lesson')).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Next lesson →'})).toHaveAttribute('href','/training/manual/chapter-1/m1/l2');
    expect(screen.getByText('Learner lesson')).toHaveAttribute('data-story-handoff','true');
    expect(screen.getByText('Learner lesson')).toHaveAttribute('data-next-lesson','/training/manual/chapter-1/m1/l2');
    expect(state.calls.some(c=>c.table==='course_lesson_facilitator_notes')).toBe(false);
  });
  it.each(['en','fil'])('continues to the next subchapter from its final lesson (%s)',async locale=>{
    state.locale=locale;
    state.rows.course_lessons.push({id:'l3',module_id:'m2',position:0,required:true,title_en:'UHC basics',title_fil:'UHC',published_revision_id:'r3'});
    state.rows.course_lesson_revisions.push({id:'r2'});
    render(await page(['chapter-1','m1','l2']));
    const next='/training/manual/chapter-1/m2/l3';
    expect(screen.getByText('Learner lesson')).toHaveAttribute('data-next-lesson',next);
    expect(screen.getByRole('link',{name:locale==='en'?'Next lesson →':'Susunod na aralin →'})).toHaveAttribute('href',next);
  });
  it('skips empty, quiz and unpublished lesson destinations',async()=>{
    state.rows.course_modules.push(
      {id:'quiz',course_id:'course',position:2,type:'quiz',title_en:'Quiz',title_fil:'Quiz'},
      {id:'empty',course_id:'course',position:3,type:'text',title_en:'Empty',title_fil:'Wala'},
      {id:'later',course_id:'course',position:4,type:'text',title_en:'Later',title_fil:'Susunod'},
    );
    state.rows.course_lessons.push(
      {id:'draft',module_id:'m2',position:0,required:true,published_revision_id:null},
      {id:'quiz-lesson',module_id:'quiz',position:0,published_revision_id:'quiz-revision'},
      {id:'l3',module_id:'later',position:0,required:true,title_en:'Published',title_fil:'Aralin',published_revision_id:'r3'},
    );
    state.rows.course_lesson_revisions.push({id:'r2'});
    render(await page(['chapter-1','m1','l2']));
    expect(screen.getByRole('link',{name:'Next lesson →'})).toHaveAttribute('href','/training/manual/chapter-1/later/l3');
    expect(screen.getByText('Learner lesson')).toHaveAttribute('data-next-lesson','/training/manual/chapter-1/later/l3');
  });
  it('does not invent a next lesson after the final published chapter lesson',async()=>{
    state.rows.course_lesson_revisions.push({id:'r2'});
    render(await page(['chapter-1','m1','l2']));
    expect(screen.getByText('Learner lesson')).not.toHaveAttribute('data-next-lesson');
    expect(screen.queryByRole('link',{name:'Next lesson →'})).not.toBeInTheDocument();
  });
  it.each(['admin','assessor'])('retains read-only facilitator slide view across subchapters for %s',async role=>{
    state.role=role;
    state.rows.course_lessons.push({id:'l3',module_id:'m2',position:0,required:true,title_en:'UHC basics',title_fil:'UHC',published_revision_id:'r3'});
    state.rows.course_lesson_revisions.push({id:'r2'});
    render(await page(['chapter-1','m1','l2'],'lesson',undefined,'slides'));
    const next='/training/manual/chapter-1/m2/l3?view=lesson&mode=slides';
    expect(screen.getByText('Admin preview')).toHaveAttribute('data-next-lesson',next);
    expect(screen.getByRole('link',{name:'Next lesson →'})).toHaveAttribute('href',next);
    expect(state.rpcCalls).not.toContain('rpc_course_lesson_complete');
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
  it('keeps the selected workspace context across 1.6.2 views and validates the return path',async()=>{
    state.role='assessor';
    state.rows.course_modules.push({id:'m6',course_id:'course',position:5,type:'text',title_en:'Communication',title_fil:'Komunikasyon'});
    state.rows.course_lessons.push({id:'clarify',module_id:'m6',lesson_key:'communication-clarify',position:1,required:true,
      title_en:'Ask and clarify',title_fil:'Magtanong at maglinaw',published_revision_id:'r6',objectives_en:['Exact objective'],objectives_fil:['Eksaktong layunin']});
    state.rows.course_lesson_revisions.push({id:'r6'});
    state.rows.course_lesson_facilitator_notes=[{revision_id:'r6',notes_en:'## [steps] Demonstration\n\nShow one correction.',notes_fil:'## [steps] Demonstrasyon\n\nIpakita ang pagwawasto.',
      observation_indicators:[{objective_index:0,observable_en:'Exact criterion',observable_fil:'Eksaktong pamantayan',not_yet_en:'Not yet',not_yet_fil:'Hindi pa',
        levels:{kaya_na_en:'Independent',kaya_na_fil:'Kaya na',kailangan_practice_en:'Prompted',kailangan_practice_fil:'May tulong',hindi_pa_en:'Retry',hindi_pa_fil:'Ulitin'}}]}];
    const returnTo='/training/manual/assessor/workspace?q=Maria&learner=123';
    render(await page(['chapter-1','m6','clarify'],'run',returnTo));
    expect(screen.getByText('Exact criterion')).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Back to working area'})).toHaveAttribute('href',returnTo);
    expect(screen.getByRole('link',{name:'Show BHW presentation'}).getAttribute('href')).toContain('returnTo=');
    cleanup();
    render(await page(['chapter-1','m6','clarify'],'lesson',returnTo));
    expect(screen.getByText('Admin preview').getAttribute('data-return-href')).toContain('returnTo=');
    cleanup();
    render(await page(['chapter-1','m6','clarify'],'prepare','https://evil.example/'));
    expect(screen.queryByRole('link',{name:'Back to working area'})).toBeNull();
  });
  it('lesson loads the featured clip for BHWs and shows it on the facilitator guide',async()=>{
    const clip={id:'clip',path:'/training/x/clip-aaaaaaaaaaaa-poster.jpg',content_hash:'a'.repeat(64),alt_en:'Eight handrub steps',alt_fil:'Walong hakbang',
      caption_en:'Handrub clip',caption_fil:'Handrub',provenance:'p',review_status:'approved',video:{path:'/training/x/clip-bbbbbbbbbbbb.mp4',content_hash:'b'.repeat(64),duration_s:60}};
    state.rows.course_lesson_revisions=[{id:'r1',read_sections:[],slides:[],assets:[clip],featured_asset_id:'clip'}];
    render(await page(['chapter-1','m1','l1']));
    expect(state.calls.find(c=>c.table==='course_lesson_revisions')?.columns).toMatch(/\bfeatured_asset_id\b/);
    cleanup();state.calls=[];state.role='assessor';
    render(await page(['chapter-1','m1','l1']));
    expect(screen.getByRole('heading',{name:'Facilitator guide for this lesson'})).toBeInTheDocument();
    expect(screen.getByRole('region',{name:'Watch'})).toBeInTheDocument();
    expect(screen.getByLabelText('Eight handrub steps')).toHaveProperty('tagName','VIDEO');
  });
  it('facilitator subchapter opens one guide view at a time and loads the roster only on Mga BHW',async()=>{
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
    expect(screen.getByRole('link',{name:/BHW Slides/})).toHaveAttribute('href','/training/manual/chapter-1/m1?view=slides');
    expect(state.calls.some(c=>['users','competency_observations'].includes(c.table))).toBe(false);
    expect(screen.queryByText('Rosa Cruz')).not.toBeInTheDocument();
    cleanup();state.calls=[];
    render(await page(['chapter-1','m1'],'competency'));
    expect(screen.getByText('Participate in workplace communication')).toBeInTheDocument();
    expect(screen.queryByText('HEPO is the umbrella')).not.toBeInTheDocument();
    cleanup();state.calls=[];
    render(await page(['chapter-1','m1'],'run'));
    expect(screen.getByRole('cell',{name:'30 min'})).toBeInTheDocument();
    cleanup();state.calls=[];
    render(await page(['chapter-1','m1'],'bhws'));
    expect(screen.getByText('Rosa Cruz')).toBeInTheDocument();expect(screen.getByText('Lito Reyes')).toBeInTheDocument();
    expect(screen.getByText(/Lessons: 1\/2 · Pretest: 60%/)).toBeInTheDocument();
    expect(screen.getByText(/Ind\. 1: Kaya na/)).toBeInTheDocument();
    expect(screen.getAllByRole('button',{name:'Record observation'})).toHaveLength(2);
    expect(state.calls.some(c=>c.table==='users')).toBe(true);
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
  it('admin viewing as BHW can open Chapter 1 without learner assessment access',async()=>{
    state.role='admin';state.preview=true;state.v2=true;
    render(await page(['chapter-1']));
    expect(screen.getByText('Preview only. Learner progress is not changed.')).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:'New Chapter 1 learning flow'})).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Pre-test'})).toHaveAttribute('href','/courses/course/assessment/preview?phase=pretest');
    expect(screen.getByRole('link',{name:'Practice checkpoints'})).toHaveAttribute('href','/courses/course/assessment/preview?phase=practice');
    expect(state.rpcCalls).not.toContain('rpc_learner_assessment_state');
    expect(screen.queryByRole('link',{name:'View assessment'})).not.toBeInTheDocument();
    cleanup();
    render(await page(['chapter-1','m1','l1']));
    expect(screen.getByText('Admin preview')).toBeInTheDocument();
    expect(state.rpcCalls).not.toContain('rpc_learner_assessment_state');
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
