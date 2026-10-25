import {createRoot} from 'react-dom/client';
import {AssessorProgressGuide,AssessorStudyProgressLink,ASSESSOR_STUDY_PROGRESS_ID} from '../../../../src/components/elearning/assessor-progress-navigation';
import {AssessorCertificationCard} from '../../../../src/components/elearning/assessor-certification-card';
import type {OverallProgress} from '../../../../src/lib/assessor/overall-certifications';
import '../../../../src/app/globals.css';
const query=new URLSearchParams(location.search),lang=query.get('lang')==='fil'?'fil':'en',en=lang==='en';
document.documentElement.lang=lang;document.documentElement.dataset.fontScale='xl';document.documentElement.dataset.theme=query.get('theme')||'light';
const state=query.get('state')||'complete_chapter-2';
const chapters=[1,2,3].map(n=>({key:'chapter-'+n,title:en?'Chapter '+n+' — '+('Published study topic '.repeat(3)):'Kabanata '+n+' — '+('Inilathalang paksa sa pag-aaral '.repeat(3))}));
const progress:OverallProgress={ruleAvailable:state!=='await_rule',qualifiedCount:state==='done'?3:0,requiredCount:3,nextStep:state==='done'?null:state,chapters:[],awards:[]};
createRoot(document.getElementById('app')!).render(<><header data-fixture-header className="sticky top-0 z-40 flex h-32 items-center bg-canvas px-4">{en?'Persistent app header':'Nakapirming header ng app'}</header><main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-6">
 <h1>{en?'My certifications':'Aking mga sertipikasyon'}</h1>
 <AssessorProgressGuide programId="manual" locale={lang} progress={progress} chapters={chapters} readFailed={state==='error'}/>
 <AssessorStudyProgressLink chapterHref="/training/manual/assessor/chapter-2" locale={lang}/>
 <div className="min-h-[80vh]" aria-hidden="true"/>
 <section id={ASSESSOR_STUDY_PROGRESS_ID} tabIndex={-1} className="scroll-mt-40 md:scroll-mt-28"><h2>{en?'Existing study progress':'Umiiral na progreso sa pag-aaral'}</h2><progress value={2} max={42} aria-label={en?'Lessons completed':'Mga araling natapos'}/></section>
 {[1,2,3].map(n=><AssessorCertificationCard key={n} chapterKey={'chapter-'+n} title={(en?'Chapter':'Kabanata')+' '+n} chapterHref={'/record/'+n} locale={lang} published={false} readFailed={false}/>)}
 <div className="min-h-screen" aria-hidden="true"/>
</main></>);
