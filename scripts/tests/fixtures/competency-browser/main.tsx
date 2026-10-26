import {createRoot} from 'react-dom/client';
import {SubchapterFacilitatorGuide} from '../../../../src/components/elearning/facilitator-guide';
import competency from '../../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/competency.json';
import moduleContent from '../../../../content/training/day1-basic-competencies/modules/01-tungkulin-ng-bhw/module.json';
import type {CourseModuleFacilitatorNotes} from '../../../../src/lib/elearning/types';
import '../../../../src/app/globals.css';
const query=new URLSearchParams(location.search),lang=query.get('lang')==='fil'?'fil':'en';
document.documentElement.lang=lang;document.documentElement.dataset.fontScale=query.get('scale')||'xl';document.documentElement.dataset.theme=query.get('theme')||'light';
const notes={...competency,id:'fixture',module_id:'module',notes_en:'',notes_fil:''} as CourseModuleFacilitatorNotes;
createRoot(document.getElementById('app')!).render(<><header data-fixture-header className="sticky top-0 z-40 flex h-32 items-center bg-canvas px-4 md:h-24">{lang==='en'?'Persistent app header':'Nakapirming header ng app'}</header><main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 sm:px-6">
 <h1>{lang==='en'?moduleContent.title_en:moduleContent.title_fil}</h1>
 <SubchapterFacilitatorGuide lang={lang} lessons={[]} objectives={lang==='en'?moduleContent.objectives_en:moduleContent.objectives_fil} notes={query.get('empty')==='yes'?null:notes} roster={[]} observations={[]} moduleId="module" rosterTruncated={false} view="competency" href="/training/manual/chapter-1/module" slidesContent={null}/>
 <div className="min-h-screen" aria-hidden="true"/>
</main></>);
