import {notFound,redirect} from 'next/navigation';
import {getLocale} from 'next-intl/server';
import {getViewer} from '@/lib/auth/viewer';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {createClient} from '@/lib/supabase/server';
import {parseSimulationState} from '@/lib/assessor/simulation-runner';
import {AssessorSimulationRunner} from '@/components/elearning/assessor-simulation-runner';

export default async function SimulationPage({params}:{params:Promise<{programId:string;chapterKey:string}>}) {
 const [{programId,chapterKey},viewer,flags,locale]=await Promise.all([params,getViewer(),getRequestFeatureFlags(),getLocale()]);
 if(!viewer.appUser||viewer.appUser.status!=='active')redirect('/login');
 if(viewer.role!=='assessor'||viewer.appUser.role!=='assessor'||viewer.isPreview||!flags.elearning)redirect('/home');
 if(chapterKey!=='chapter-1'||!flags.assessor_flow_ui)notFound();
 const db=await createClient();
 const {data,error}=await db.rpc('rpc_assessor_simulation_state',{p_program_id:programId});
 const initial=error?null:parseSimulationState(data,programId,viewer.appUser.id);
 const chapterHref=`/training/${programId}/assessor/chapter-1`;
 if(!initial)redirect(chapterHref);
 return <AssessorSimulationRunner initial={initial} locale={locale} chapterHref={chapterHref}
  workspaceHref={`/training/${programId}/assessor/workspace`}/>;
}
