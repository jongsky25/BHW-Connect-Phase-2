import {createRoot} from 'react-dom/client';
import {GroupLearningGuideLinks} from '../../../../src/components/elearning/group-learning-guide-links';
import {LessonFacilitatorGuide,SubchapterFacilitatorGuide} from '../../../../src/components/elearning/facilitator-guide';
import '../../../../src/app/globals.css';
const query=new URLSearchParams(location.search),lang=query.get('lang')==='fil'?'fil':'en',en=lang==='en';
document.documentElement.lang=lang;document.documentElement.dataset.fontScale='xl';document.documentElement.dataset.theme=query.get('theme')||'light';
const headings=en?['Opening prompt','Discuss the example','Expected responses','Group practice','Follow-up support']:['Pambungad na tanong','Talakayin ang halimbawa','Inaasahang tugon','Pagsasanay ng pangkat','Dagdag na suporta'];
const ids=['opening','steps','expected-answers','practice','support'];
const notes=ids.map((id,i)=>`## [${id}] ${headings[i]}\n\n${en?'Fictional teaching example. Explain what is known, discuss what still needs checking, and try again with support.':'Kathang halimbawa sa pagtuturo. Ipaliwanag ang alam na, talakayin ang dapat pang suriin, at subukang muli na may suporta.'}`).join('\n\n');
const lessons=[1,2].map(n=>({id:'lesson-'+n,href:'/training/manual/chapter-1/module/lesson-'+n,title:(en?'Published lesson ':'Inilathalang aralin ')+n+' — '+(en?'A deliberately long topic title for group facilitation':'Mahabang pamagat ng paksa para sa paggabay sa pangkat'),objectives:[],takeaways:[]}));
createRoot(document.getElementById('app')!).render(<><header data-fixture-header className="sticky top-0 z-40 flex h-32 items-center bg-canvas px-4">{en?'Persistent app header':'Nakapirming header ng app'}</header><main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-6">
 <h1>{en?'Facilitator-led group learning':'Pag-aaral ng pangkat na may facilitator'}</h1>
 {query.get('view')==='run'?<SubchapterFacilitatorGuide lang={lang} lessons={lessons} objectives={[]} notes={null} roster={[]} observations={[]} moduleId="module" rosterTruncated={false} view="run" href="/training/manual/chapter-1/module" slidesContent={null}/>:<>
 <GroupLearningGuideLinks locale={lang} lessonHref="/training/manual/chapter-1/module/lesson-1" moduleHref="/training/manual/chapter-1/module"/>
 <LessonFacilitatorGuide lang={lang} notesMarkdown={notes} indicators={[]} objectives={[]}/>
 </>}
 <div className="min-h-screen" aria-hidden="true"/>
</main></>);
