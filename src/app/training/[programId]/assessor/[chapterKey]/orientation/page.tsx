import {notFound,redirect} from 'next/navigation';
import {getLocale} from 'next-intl/server';
import {getViewer} from '@/lib/auth/viewer';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {createClient} from '@/lib/supabase/server';
import {AssessorOrientation,type OrientationState} from '@/components/elearning/assessor-orientation';
import {Breadcrumbs} from '@/components/breadcrumbs';

export default async function OrientationPage({params}:{params:Promise<{programId:string;chapterKey:string}>}) {
  const [{programId,chapterKey},viewer,flags,locale]=await Promise.all([params,getViewer(),getRequestFeatureFlags(),getLocale()]);
  if(!viewer.appUser || viewer.appUser.status!=='active')redirect('/login');
  if(!flags.elearning || viewer.role!=='assessor' || viewer.appUser.role!=='assessor' || viewer.isPreview)redirect('/home');
  if(chapterKey!=='chapter-1'&&chapterKey!=='chapter-2')notFound();
  const db=await createClient();
  const [{data:program,error:programError},{data:chapter,error:chapterError}]=await Promise.all([
    db.from('training_programs').select('id').eq('id',programId).eq('content_key','bhw-reference-manual').eq('status','published').maybeSingle(),
    db.from('training_program_chapters').select('id').eq('program_id',programId).eq('chapter_key',chapterKey).eq('availability','available').maybeSingle(),
  ]);
  if(programError||chapterError)throw new Error('Unable to load assessor orientation');
  if(!program||!chapter)notFound();
  const {data,error}=await db.rpc('rpc_assessor_orientation_state',{p_chapter_id:chapter.id});
  if(error)throw new Error('Unable to load assessor orientation');
  const state=data as OrientationState;
  const chapterHref=`/training/${programId}/assessor/${chapterKey}`;
  const chapterLabel=chapterKey==='chapter-1'?{fil:'Kabanata I',en:'Chapter I'}:{fil:'Kabanata II',en:'Chapter II'};
  return <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
    <Breadcrumbs items={[{label:'BHW Reference Manual',href:`/training/${programId}`},{label:chapterLabel[locale==='en'?'en':'fil'],href:chapterHref},{label:locale==='en'?'Scoring orientation':'Oryentasyon sa pagmamarka'}]}/>
    <AssessorOrientation chapterId={chapter.id} chapterHref={chapterHref} chapterLabel={chapterLabel} locale={locale} initial={state}/>
  </main>;
}
