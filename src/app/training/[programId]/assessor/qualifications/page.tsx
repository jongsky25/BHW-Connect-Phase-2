import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {getLocale} from 'next-intl/server';
import {getViewer} from '@/lib/auth/viewer';
import {getRequestFeatureFlags} from '@/lib/supabase/request';
import {createClient} from '@/lib/supabase/server';
import {AssessorQualificationCard,type QualificationState} from '@/components/elearning/assessor-qualification-card';
import {Breadcrumbs} from '@/components/breadcrumbs';

export default async function MyQualificationsPage({params}:{params:Promise<{programId:string}>}){
  const [{programId},viewer,flags,locale]=await Promise.all([params,getViewer(),getRequestFeatureFlags(),getLocale()]);
  if(!viewer.appUser||viewer.appUser.status!=='active')redirect('/login');
  if(!flags.elearning||viewer.role!=='assessor'||viewer.appUser.role!=='assessor'||viewer.isPreview)redirect('/home');
  const db=await createClient();
  const [{data:program,error:programError},{data:chapters,error:chapterError}]=await Promise.all([
    db.from('training_programs').select('id').eq('id',programId).eq('content_key','bhw-reference-manual').eq('status','published').maybeSingle(),
    db.from('training_program_chapters').select('id,chapter_key,title_fil,title_en,availability,course_id')
      .eq('program_id',programId).in('chapter_key',['chapter-1','chapter-2']).order('position').limit(2),
  ]);
  if(programError||chapterError)throw new Error('Unable to load assessor chapters');
  if(!program)notFound();
  const available=(chapters??[]).filter(c=>c.availability==='available'&&c.course_id);
  const states=await Promise.all(available.map(c=>db.rpc('rpc_assessor_qualification_state',{p_chapter_id:c.id})));
  if(states.some(s=>s.error))throw new Error('Unable to load assessor qualifications');
  const en=locale==='en';
  const text=(fil:string,english:string)=>en?english:fil;
  return <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
    <Breadcrumbs items={[{label:'BHW Reference Manual',href:`/training/${programId}`},{label:text('Aking mga kwalipikasyon','My qualifications')}]}/>
    <header><h1 className="text-2xl font-semibold">{text('Aking mga kwalipikasyon','My qualifications')}</h1>
      <p className="mt-2">{text('Hiwalay ang kwalipikasyon para sa bawat kabanata. Natatanggap ito matapos ang kumpletong pag-aaral, pagsusulit, at oryentasyon.','Each chapter has its own qualification. It is issued after the full study, exam, and orientation sequence.')}</p></header>
    <div className="grid gap-4">{available.map((c,i)=><AssessorQualificationCard key={c.id} chapterId={c.id}
      chapterTitle={en?c.title_en:c.title_fil} chapterHref={`/training/${programId}/assessor/${c.chapter_key}`}
      locale={locale} state={states[i].data as QualificationState}/>)}</div>
    <Link prefetch={false} href={`/training/${programId}`} className="self-start py-2 underline">{text('Bumalik sa manwal','Back to manual')}</Link>
  </main>;
}
