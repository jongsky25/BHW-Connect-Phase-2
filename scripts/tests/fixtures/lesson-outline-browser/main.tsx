import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ManualLesson} from '../../../../src/components/elearning/manual-lesson';
import type {ReferenceData} from '../../../../src/components/elearning/reference-lessons';
import '../../../../src/app/globals.css';
const query=new URLSearchParams(location.search),lang=query.get('lang')==='fil'?'fil':'en';
document.documentElement.lang=lang;document.documentElement.dataset.fontScale='xl';document.documentElement.dataset.theme=query.get('theme')||'light';
function App(){
 const [data,setData]=useState<ReferenceData|null>(null);
 useEffect(()=>{void fetch(`/fixture/data?case=${query.get('case')}`).then(r=>r.json()).then(setData);},[]);
 return <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6 sm:px-6"><h1>{lang==='en'?'Manual lesson':'Aralin sa manwal'}</h1>
 {data?<ManualLesson data={data} modules={[]} lessonId="lesson" baseHref="/lessons" locale={lang} readOnly={query.get('role')==='preview'}
  assessorChapterId={query.get('role')==='assessor'?'chapter':undefined} lessonNumber={1} lessonCount={42}/>:<p role="status">Loading fixture…</p>}</main>;
}
createRoot(document.getElementById('app')!).render(<App/>);
