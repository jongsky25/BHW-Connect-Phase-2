import {createRoot} from 'react-dom/client';
import {AssessorProgressGuide,AssessorStudyProgressLink,ASSESSOR_STUDY_PROGRESS_ID} from '../../../../src/components/elearning/assessor-progress-navigation';
import type {OverallProgress} from '../../../../src/lib/assessor/overall-certifications';
import '../../../../src/app/globals.css';
const query=new URLSearchParams(location.search),lang=query.get('lang')==='fil'?'fil':'en',en=lang==='en';
document.documentElement.lang=lang;document.documentElement.dataset.fontScale='xl';document.documentElement.dataset.theme=query.get('theme')||'light';
const state=query.get('state')||'complete_chapter-2';
const chapters=[1,2,3].map(n=>({key:'chapter-'+n,title:en?'Chapter '+n+' — '+('Published study topic '.repeat(3)):'Kabanata '+n+' — '+('Inilathalang paksa sa pag-aaral '.repeat(3))}));
const progress:OverallProgress={ruleAvailable:state!=='await_rule',qualifiedCount:state==='done'?3:0,requiredCount:3,nextStep:state==='done'?null:state,chapters:[],awards:[]};
createRoot(document.getElementById('app')!).render(<main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-6">
 <h1>{en?'My certifications':'Aking mga sertipikasyon'}</h1>
 <AssessorProgressGuide programId="manual" locale={lang} progress={progress} chapters={chapters} readFailed={state==='error'}/>
 <AssessorStudyProgressLink chapterHref="/training/manual/assessor/chapter-2" locale={lang}/>
 <div className="min-h-[80vh]" aria-hidden="true"/>
 <section id={ASSESSOR_STUDY_PROGRESS_ID} tabIndex={-1}><h2>{en?'Existing study progress':'Umiiral na progreso sa pag-aaral'}</h2><progress value={2} max={42} aria-label={en?'Lessons completed':'Mga araling natapos'}/></section>
 {[1,2,3].map(n=><section id={'chapter-'+n} key={n} tabIndex={-1}><h2>{en?'Chapter':'Kabanata'} {n}</h2><p>{en?'Existing certification record':'Umiiral na tala ng sertipikasyon'}</p></section>)}
</main>);
