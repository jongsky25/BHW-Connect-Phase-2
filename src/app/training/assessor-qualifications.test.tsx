import {render,screen} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import QualificationsPage from './[programId]/assessor/qualifications/page';
const state=vi.hoisted(()=>({role:'assessor',actualRole:'assessor',active:true,preview:false,enabled:true,locale:'en',fail:'',calls:[] as string[],step:'complete_chapter-2'}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw Error('REDIRECT '+url)},notFound:()=>{throw Error('NOT_FOUND')},useRouter:()=>({refresh:vi.fn()})}));
vi.mock('next-intl/server',()=>({getLocale:async()=>state.locale}));
vi.mock('@/lib/auth/viewer',()=>({getViewer:async()=>({appUser:{id:'self',role:state.actualRole,status:state.active?'active':'deactivated'},role:state.role,isPreview:state.preview})}));
vi.mock('@/lib/supabase/request',()=>({getRequestFeatureFlags:async()=>({elearning:state.enabled})}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({from:(table:string)=>{
 let single=false;const q={select:()=>q,eq:()=>q,in:()=>q,order:()=>q,limit:()=>q,maybeSingle:()=>{single=true;return q},then:(resolve:(v:unknown)=>unknown)=>{
  state.calls.push(table);const data=table==='training_programs'?[{id:'manual'}]:[1,2,3].map(n=>({id:'ch'+n,chapter_key:'chapter-'+n,title_en:'Chapter '+n,title_fil:'Kabanata '+n,availability:'available',course_id:'course'+n}));
  return Promise.resolve(resolve({data:single?data[0]:data,error:state.fail===table?{message:'read failed'}:null}));
 }};return q;
},rpc:async(name:string)=>{
 state.calls.push(name);
 const data=name==='rpc_assessor_overall_progress'?{ruleAvailable:true,qualifiedCount:0,requiredCount:3,nextStep:state.step,chapters:[],awards:[]}
  :name==='rpc_assessor_certifications_state'?[1,2,3].map(n=>({chapterKey:'chapter-'+n,publicationAvailable:true,revisedPath:n===1,awards:[],legacy:[]}))
   :{status:'in_progress',next_step:'study'};
 return {data,error:state.fail===name?{message:'read failed'}:null};
}})}));
beforeEach(()=>Object.assign(state,{role:'assessor',actualRole:'assessor',active:true,preview:false,enabled:true,locale:'en',fail:'',calls:[],step:'complete_chapter-2'}));
const page=()=>QualificationsPage({params:Promise.resolve({programId:'manual'})});
it.each(['en','fil'])('connects trusted overall guidance to existing study progress without writes (%s)',async locale=>{
 state.locale=locale;render(await page());
 expect(screen.getByRole('link',{name:locale==='en'?'Open Chapter 2 study progress':'Buksan ang progreso sa pag-aaral sa Kabanata 2'})).toHaveAttribute('href','/training/manual/assessor/chapter-2#assessor-study-progress');
 expect(state.calls.filter(c=>c.startsWith('rpc_'))).toEqual(['rpc_assessor_certifications_state','rpc_assessor_overall_progress',...Array(3).fill('rpc_assessor_qualification_state')]);
});
it.each(['rpc_assessor_overall_progress','rpc_assessor_certifications_state','training_program_chapters'])('suppresses specific guidance after %s read failure',async fail=>{
 state.fail=fail;render(await page());expect(screen.getByRole('link',{name:'Reload status'})).toHaveAttribute('href','/training/manual/assessor/qualifications');
 expect(screen.queryByRole('link',{name:'Open Chapter 2 study progress'})).toBeNull();
});
it.each(['bhw','admin'])('retains %s role gating before database reads',async role=>{
 state.role=role;await expect(page()).rejects.toThrow('REDIRECT /home');expect(state.calls).toEqual([]);
});
it('retains preview and inactive-account guards',async()=>{
 state.preview=true;await expect(page()).rejects.toThrow('REDIRECT /home');
 state.preview=false;state.active=false;await expect(page()).rejects.toThrow('REDIRECT /login');expect(state.calls).toEqual([]);
});
