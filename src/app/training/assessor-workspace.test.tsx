import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import Workspace from './[programId]/assessor/workspace/page';

const state=vi.hoisted(()=>({role:'assessor',actual:'assessor',active:true,preview:false,locale:'en',
  rosterError:false,rpc:vi.fn(),learning:true,notes:true,readinessUI:false}));
vi.mock('server-only',()=>({}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error(`REDIRECT ${url}`);},
  notFound:()=>{throw new Error('NOT_FOUND');},useRouter:()=>({refresh:vi.fn()})}));
vi.mock('next-intl/server',()=>({getLocale:async()=>state.locale}));
vi.mock('@/components/breadcrumbs',()=>({Breadcrumbs:()=>null}));
vi.mock('@/lib/auth/viewer',()=>({getViewer:async()=>({appUser:{id:'self',role:state.actual,status:state.active?'active':'deactivated'},role:state.role,isPreview:state.preview})}));
vi.mock('@/lib/supabase/request',()=>({getRequestFeatureFlags:async()=>({elearning:state.learning,chapter1_assessment_v2:state.notes,assessor_flow_ui:state.readinessUI})}));
const area='00000000-0000-4000-8000-000000000001';
const maria='00000000-0000-4000-8000-000000000002';
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({
  from:(table:string)=>{const value=table==='training_programs'?{id:'program'}:table==='training_program_chapters'?{id:'chapter',course_id:'course'}:
    table==='course_modules'?{id:'communication'}:{id:'clarify'};
    const q={select:()=>q,eq:()=>q,not:()=>q,maybeSingle:async()=>({data:value,error:null})};return q;},
  rpc:state.rpc,
})}));
const page=(query:Record<string,string>={})=>Workspace({params:Promise.resolve({programId:'program'}),searchParams:Promise.resolve(query)});
beforeEach(()=>{
  Object.assign(state,{role:'assessor',actual:'assessor',active:true,preview:false,locale:'en',rosterError:false,learning:true,notes:true,readinessUI:false});
  state.rpc.mockReset().mockImplementation(async(name:string)=>name==='rpc_assessor_chapter1_workspace'
    ? {data:{rows:[{id:maria,full_name:'Maria Santos',barangay:'Barangay One',area_id:area,learning_status:'in_progress'}],
      total:21,page:2,pageSize:20,areas:[{id:area,name:'Barangay One'}],areasTruncated:false},error:state.rosterError?{message:'offline'}:null}
    : {data:[],error:null});
});
afterEach(cleanup);
describe('Chapter 1 working area',()=>{
  it.each([{role:'bhw'},{actual:'admin'},{preview:true},{learning:false}])('denies unsupported viewer %j before reads',async changes=>{
    Object.assign(state,changes);await expect(page()).rejects.toThrow('REDIRECT /home');expect(state.rpc).not.toHaveBeenCalled();
  });
  it('keeps filters on learner view and return, with a bounded server roster read',async()=>{
    render(await page({q:'Maria',area,status:'in_progress',page:'2',learner:maria}));
    expect(state.rpc).toHaveBeenCalledWith('rpc_assessor_chapter1_workspace',{
      p_program_id:'program',p_search:'Maria',p_area_id:area,p_status:'in_progress',p_page:2,
    });
    expect(screen.getByRole('heading',{name:'Maria Santos · Barangay One'})).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Prepare lesson 1.6.2 with this context'}).getAttribute('href')).toContain('learner%3D');
    expect(screen.getByRole('link',{name:'Back to list'}).getAttribute('href')).toContain('page=2');
    expect(screen.getByRole('link',{name:'Back to list'}).getAttribute('href')).not.toContain('learner=');
    expect(screen.getByRole('link',{name:'Previous'}).getAttribute('href')).toContain('q=Maria');
    expect(screen.queryByRole('link',{name:/Record assessment/i})).toBeNull();
  });
  it('shows an error separate from an empty roster and leaves study accessible',async()=>{
    state.rosterError=true;render(await page());
    expect(screen.getByRole('alert')).toHaveTextContent('Roster could not be loaded');
    expect(screen.getByRole('link',{name:'Continue preparation'})).toBeInTheDocument();
    expect(screen.queryByText('No active BHWs in your catchment yet.')).toBeNull();
  });
  it('shows selected learner component blockers without creating an assessment',async()=>{
    state.readinessUI=true;
    state.rpc.mockImplementation(async(name:string)=>name==='rpc_assessor_chapter1_workspace'
      ?{data:{rows:[{id:maria,full_name:'Maria Santos',barangay:'Barangay One',area_id:area,learning_status:'in_progress'}],
        total:1,page:1,pageSize:20,areas:[],areasTruncated:false},error:null}
      :name==='rpc_assessor_component_readiness'
        ?{data:[{moduleId:'module',titleFil:'Bahagi',titleEn:'Component',learnerReady:false,actorAuthorized:false,canArrange:false,
          learnerBlockers:['required_lessons_incomplete'],authorityBlockers:['chapter_award_required'],
          missingLessonIds:[],staleLessonIds:[],missingTestPhases:[]}],error:null}
        :{data:[],error:null});
    render(await page({learner:maria}));
    expect(state.rpc).toHaveBeenCalledWith('rpc_assessor_component_readiness',{
      p_program_id:'program',p_bhw_user_id:maria,
    });
    expect(screen.getByText('Required lessons remain incomplete.')).toBeInTheDocument();
    expect(screen.getByText('An active Chapter 1 assessor award is required.')).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Review Chapter 1 evidence'}).getAttribute('href'))
      .toContain(`learner=${maria}`);
    expect(screen.queryByRole('link',{name:/start formal assessment/i})).toBeNull();
  });
  it('shows an explicit request action and pending claim without a formal outcome action',async()=>{
    state.readinessUI=true;
    state.rpc.mockImplementation(async(name:string)=>name==='rpc_assessor_chapter1_workspace'
      ?{data:{rows:[{id:maria,full_name:'Maria Santos',barangay:'Barangay One',area_id:area,learning_status:'in_progress'}],
        total:1,page:1,pageSize:20,areas:[],areasTruncated:false},error:null}
      :name==='rpc_assessor_component_readiness'
        ?{data:[{moduleId:'module',titleFil:'Bahagi',titleEn:'Component',learnerReady:true,actorAuthorized:true,canArrange:true,
          learnerBlockers:[],authorityBlockers:[],missingLessonIds:[],staleLessonIds:[],missingTestPhases:[]}],error:null}
        :name==='rpc_assessor_component_request_queue'
          ?{data:[{id:'request',moduleId:'module',moduleTitleFil:'Bahagi',moduleTitleEn:'Component',
            learnerName:'Maria Santos',status:'pending',agreedAt:null,location:null,assignedToMe:false,
            requestedByMe:true,assignedUnavailable:false}],error:null}
          :{data:[],error:null});
    render(await page({learner:maria}));
    expect(screen.getByRole('button',{name:'Request assessment'})).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Claim request'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:/complete assessment|record result/i})).toBeNull();
  });
  it('shows Filipino section labels and an honest empty state',async()=>{
    state.locale='fil';state.rpc.mockImplementation(async(name:string)=>name==='rpc_assessor_chapter1_workspace'
      ? {data:{rows:[],total:0,page:1,pageSize:20,areas:[],areasTruncated:false},error:null}:{data:[],error:null});
    render(await page());
    expect(screen.getByRole('heading',{name:'Mga BHW na sinusuportahan ko'})).toBeInTheDocument();
    expect(screen.getByText('Wala pang aktibong BHW sa iyong saklaw.')).toBeInTheDocument();
  });
});
