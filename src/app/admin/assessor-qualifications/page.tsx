import {getLocale} from 'next-intl/server';
import Link from 'next/link';
import {AssessorQualificationConsole,type QualificationRow} from '@/components/admin/assessor-qualification-console';
import {AssessorAwardLifecycle,type AwardRow,type TransitionRow} from '@/components/admin/assessor-award-lifecycle';
import {createClient} from '@/lib/supabase/server';

export default async function AdminAssessorQualificationsPage({searchParams}:{searchParams:Promise<{page?:string;awardPage?:string;transitionPage?:string}>}){
  const db=await createClient();
  const [locale,query]=await Promise.all([getLocale(),searchParams]);
  const rawPage=Number(query.page),page=Number.isSafeInteger(rawPage)&&rawPage>0?Math.min(rawPage,100000):1;
  const awardPage=Number.isSafeInteger(Number(query.awardPage))&&Number(query.awardPage)>0?Math.min(Number(query.awardPage),10000):1;
  const transitionPage=Number.isSafeInteger(Number(query.transitionPage))&&Number(query.transitionPage)>0?Math.min(Number(query.transitionPage),10000):1;
  const pageSize=50;
  const [awardResult,transitionResult,qualificationResult]=await Promise.all([
    db.rpc('rpc_admin_assessor_awards',{p_page:awardPage}),
    db.rpc('rpc_admin_assessor_transition_report',{p_page:transitionPage}),
    db.from('assessor_chapter_qualifications')
      .select('id,assessor_user_id,chapter_id,curriculum_version,status,issued_at',{count:'exact'})
      .order('issued_at',{ascending:false}).range((page-1)*pageSize,page*pageSize-1),
  ]);
  if(awardResult.error||transitionResult.error)throw new Error('Unable to load assessor lifecycle report');
  const awards=awardResult.data as {mutationEnabled:boolean;rows:AwardRow[]};
  const transition=transitionResult.data as TransitionRow[];
  const {data:qualifications,error,count}=qualificationResult;
  if(error)throw new Error('Unable to load assessor qualifications');
  const userIds=[...new Set((qualifications??[]).map(q=>q.assessor_user_id))];
  const chapterIds=[...new Set((qualifications??[]).map(q=>q.chapter_id))];
  const [{data:users,error:userError},{data:chapters,error:chapterError}]=await Promise.all([
    userIds.length?db.from('users').select('id,username,full_name').in('id',userIds).limit(pageSize):Promise.resolve({data:[],error:null}),
    chapterIds.length?db.from('training_program_chapters').select('id,title_fil,title_en').in('id',chapterIds).limit(pageSize):Promise.resolve({data:[],error:null}),
  ]);
  if(userError||chapterError)throw new Error('Unable to load qualification details');
  const userById=new Map((users??[]).map(u=>[u.id,u.full_name||u.username]));
  const chapterById=new Map((chapters??[]).map(c=>[c.id,locale==='en'?c.title_en:c.title_fil]));
  const rows:QualificationRow[]=(qualifications??[]).map(q=>({...q,status:q.status as QualificationRow['status'],
    assessor_name:userById.get(q.assessor_user_id)??q.assessor_user_id,chapter_name:chapterById.get(q.chapter_id)??q.chapter_id}));
  return <main className="space-y-6"><header><h1 className="text-2xl font-semibold">{locale==='en'?'Assessor qualifications':'Mga kwalipikasyon ng assessor'}</h1>
    <p className="mt-2 text-sm">{locale==='en'?'Manage issued qualifications in your assigned area. Every status change requires a reason and is audited.':'Pamahalaan ang mga kwalipikasyon sa iyong saklaw. Bawat pagbabago ng katayuan ay nangangailangan ng dahilan at naitatala sa audit.'}</p></header>
    <AssessorAwardLifecycle rows={awards.rows} mutationEnabled={awards.mutationEnabled} report={transition} awardPage={awardPage} transitionPage={transitionPage} locale={locale}/>
    <AssessorQualificationConsole rows={rows} locale={locale}/>
    <nav className="flex gap-4" aria-label={locale==='en'?'Qualification pages':'Mga pahina ng kwalipikasyon'}>
      {page>1&&<Link className="underline" prefetch={false} href={`/admin/assessor-qualifications?page=${page-1}&awardPage=${awardPage}&transitionPage=${transitionPage}`}>{locale==='en'?'Previous':'Nakaraan'}</Link>}
      {page*pageSize<(count??0)&&<Link className="underline" prefetch={false} href={`/admin/assessor-qualifications?page=${page+1}&awardPage=${awardPage}&transitionPage=${transitionPage}`}>{locale==='en'?'Next':'Susunod'}</Link>}
    </nav></main>;
}
