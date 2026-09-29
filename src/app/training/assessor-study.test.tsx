import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import StudyPage from './[programId]/assessor/[chapterKey]/[[...path]]/page';
import manifest from '../../../content/assessor/bhw-reference-manual.v1.json';
const state=vi.hoisted(()=>({role:'assessor',actualRole:'assessor',active:true,preview:false,enabled:true,locale:'en',failing:'',calls:[] as string[],rows:{} as Record<string,Record<string,unknown>[]>}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error('REDIRECT '+url)},notFound:()=>{throw new Error('NOT_FOUND')}}));
vi.mock('next-intl/server',()=>({getLocale:async()=>state.locale}));
vi.mock('@/lib/auth/viewer',()=>({getViewer:async()=>({appUser:{id:'self',role:state.actualRole,status:state.active?'active':'deactivated'},role:state.role,isPreview:state.preview})}));
vi.mock('@/lib/supabase/request',()=>({getRequestFeatureFlags:async()=>({elearning:state.enabled})}));
vi.mock('@/components/elearning/manual-lesson',()=>({ManualLesson:({readOnly,assessorChapterId,nextLessonHref}:{readOnly:boolean;assessorChapterId:string;nextLessonHref?:string})=><div data-readonly={String(readOnly)} data-chapter={assessorChapterId} data-next={nextLessonHref}>Study reader</div>}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({from:(table:string)=>{
  state.calls.push(table);let single=false;
  const filters:Array<(r:Record<string,unknown>)=>boolean>=[];
  const q={select:()=>q,eq:(key:string,v:unknown)=>{filters.push(r=>r[key]===v);return q},in:(key:string,v:unknown[])=>{filters.push(r=>v.includes(r[key]));return q},not:(key:string,_op:string,v:unknown)=>{filters.push(r=>r[key]!==v);return q},order:()=>q,limit:()=>q,returns:()=>q,
    maybeSingle:()=>{single=true;return q},single:()=>{single=true;return q},then:(resolve:(v:unknown)=>void)=>{
      const rows=(state.rows[table]??[]).filter(r=>filters.every(f=>f(r)));
      resolve({data:single?rows[0]??null:rows,error:state.failing===table?{message:'error'}:null});
    }};return q;
}})}));
beforeEach(()=>{
  Object.assign(state,{role:'assessor',actualRole:'assessor',active:true,preview:false,enabled:true,locale:'en',failing:'',calls:[]});
  state.rows={training_programs:[{id:'manual',content_key:'bhw-reference-manual',status:'published',title_en:'Manual',title_fil:'Manwal'}],
    training_program_chapters:[{id:'ch1',program_id:'manual',chapter_key:'chapter-1',course_id:'course',availability:'available',title_en:'Chapter I',title_fil:'Kabanata I'}],
    courses:[{id:'course',status:'published'}],course_modules:[{id:'m1',course_id:'course',position:0,title_en:'Roles',title_fil:'Tungkulin'}],
    course_lessons:[{id:'l1',module_id:'m1',lesson_key:'bhw-roles-hepo',position:0,published_revision_id:'r1',title_en:'HEPO',title_fil:'HEPO'},
      {id:'l2',module_id:'m1',lesson_key:'bhw-health-educator',position:1,published_revision_id:'r2',title_en:'Educator',title_fil:'Tagapagturo'}],
    course_lesson_revisions:[{id:'r1',lesson_id:'l1'}],assessor_lesson_progress:[{assessor_user_id:'other',chapter_id:'ch1',lesson_id:'l1',revision_id:'r1'}],assessor_lesson_resume:[],
    assessor_exam_attempts:[{id:'a1',assessor_user_id:'self',chapter_id:'ch1',curriculum_version:'2026-09-28.1',phase:'pretest',status:'submitted',score_percent:0,passed:false}]};
});
afterEach(cleanup);
const page=(path:string[]=[],chapterKey='chapter-1')=>StudyPage({params:Promise.resolve({programId:'manual',chapterKey,path})});
describe('assessor study route',()=>{
  it('shows the full chapter denominator and personal progress only',async()=>{
    render(await page());expect(screen.getByText('0 of 42 required lessons completed')).toBeInTheDocument();
    expect(screen.getByText(/40 required lessons are not yet available/)).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Continue studying'})).toHaveAttribute('href','/training/manual/assessor/chapter-1/m1/l1');
    expect(state.calls.some(t=>['course_progress','assessments','certificates','course_lesson_facilitator_notes'].includes(t))).toBe(false);
  });
  it('restores a current saved bookmark and renders the writable candidate reader',async()=>{
    state.rows.assessor_lesson_resume=[{assessor_user_id:'self',chapter_id:'ch1',lesson_id:'l2',revision_id:'r2',updated_at:'2026-09-28'}];
    const {unmount}=render(await page());expect(screen.getByRole('link',{name:'Continue studying'})).toHaveAttribute('href','/training/manual/assessor/chapter-1/m1/l2');unmount();
    render(await page(['m1','l1']));expect(screen.getByText('Study reader')).toHaveAttribute('data-chapter','ch1');expect(screen.getByText('Study reader')).toHaveAttribute('data-readonly','false');
    expect(screen.getByText('Study reader')).toHaveAttribute('data-next','/training/manual/assessor/chapter-1/m1/l2');
  });
  it('requires the diagnostic pretest before opening lessons',async()=>{
    state.rows.assessor_exam_attempts=[];
    render(await page());
    expect(screen.getByRole('link',{name:'Take the diagnostic pretest'})).toHaveAttribute('href','/training/manual/assessor/chapter-1/exam/pretest');
    expect(screen.queryByRole('link',{name:'Continue studying'})).toBeNull();
    await expect(page(['m1','l1'])).rejects.toThrow('REDIRECT /training/manual/assessor/chapter-1/exam/pretest');
  });
  it('shows personal exam history and does not enter the BHW test route',async()=>{
    state.rows.assessor_exam_attempts.push({id:'a2',assessor_user_id:'self',chapter_id:'ch1',curriculum_version:'2026-09-28.1',phase:'posttest',status:'submitted',score_percent:79,passed:false});
    render(await page());
    expect(screen.getByText(/Post-test: 79%/)).toBeInTheDocument();
    expect(state.calls).not.toContain('course_test_attempts');
  });
  it('opens Chapter I orientation after all current lessons and the chapter exam pass',async()=>{
    const modules=manifest.chapters[0].modules;
    state.rows.course_modules=modules.map((m,i)=>({id:m.module_key,course_id:'course',position:i,title_en:m.title.en,title_fil:m.title.fil}));
    state.rows.course_lessons=modules.flatMap(m=>m.required_lesson_keys.map((key,i)=>({
      id:key,module_id:m.module_key,lesson_key:key,position:i,published_revision_id:`revision-${key}`,title_en:key,title_fil:key,
    })));
    state.rows.assessor_lesson_progress=state.rows.course_lessons.map(l=>({assessor_user_id:'self',chapter_id:'ch1',lesson_id:l.id,revision_id:l.published_revision_id}));
    state.rows.assessor_exam_attempts.push({id:'a2',assessor_user_id:'self',chapter_id:'ch1',curriculum_version:'2026-09-28.1',phase:'posttest',status:'submitted',score_percent:80,passed:true});
    render(await page());
    expect(screen.getByRole('link',{name:'Start scoring orientation'})).toHaveAttribute('href','/training/manual/assessor/chapter-1/orientation');
  });
  it.each(['admin','bhw','designer'])('denies %s before any study query',async role=>{
    state.role=role;state.actualRole=role;await expect(page()).rejects.toThrow('REDIRECT /home');expect(state.calls).toEqual([]);
  });
  it('denies view-as preview, inactive actors and disabled learning',async()=>{
    state.preview=true;await expect(page()).rejects.toThrow('REDIRECT /home');
    state.preview=false;state.active=false;await expect(page()).rejects.toThrow('REDIRECT /login');
    state.active=true;state.enabled=false;await expect(page()).rejects.toThrow('REDIRECT /home');expect(state.calls).toEqual([]);
  });
  it('rejects unavailable chapters, other programs, and lesson/module mismatches',async()=>{
    await expect(page([],'chapter-3')).rejects.toThrow('NOT_FOUND');
    await expect(page(['wrong','l1'])).rejects.toThrow('NOT_FOUND');
    state.rows.training_programs[0].content_key='other';await expect(page()).rejects.toThrow('NOT_FOUND');
  });
  it('reports a progress read failure instead of silently resetting progress',async()=>{
    state.failing='assessor_lesson_progress';await expect(page()).rejects.toThrow('Unable to load your candidate progress');
  });
  it('renders Filipino study guidance',async()=>{
    state.locale='fil';render(await page());expect(screen.getByText('Sariling pag-aaral ng assessor')).toBeInTheDocument();expect(screen.getByRole('link',{name:'Magpatuloy sa pag-aaral'})).toBeInTheDocument();
  });
});
