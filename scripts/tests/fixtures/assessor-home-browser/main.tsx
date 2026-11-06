import {createRoot} from 'react-dom/client';
import {MyAssessorTrainingCard} from '../../../../src/components/progress/my-assessor-training-card';
import '../../../../src/app/globals.css';
const query=new URLSearchParams(location.search),locale=query.get('lang')==='fil'?'fil':'en';
document.documentElement.lang=locale;
document.documentElement.dataset.fontScale='xl';
document.documentElement.dataset.theme=query.get('theme')||'light';
const complete=query.get('state')==='complete';
createRoot(document.getElementById('app')!).render(<main className="space-y-4 px-4 py-8"><h1>{locale==='en'?'Welcome, assessor!':'Maligayang pagdating, assessor!'}</h1>
<MyAssessorTrainingCard locale={locale} progress={{programId:'manual',counts:{done:complete?84:2,total:84,percent:complete?100:2},chapters:[1,2].map(n=>({
 id:`chapter-${n}`,number:n,title_en:'Working with communities and supporting families',title_fil:'Pakikipagtulungan sa mga komunidad at pagsuporta sa mga pamilya',
 href:n===1||complete?`/training/manual/assessor/chapter-${n}`:null,counts:{done:complete?42:n===1?2:0,total:42,percent:complete?100:n===1?5:0},missing:complete?0:n===1?0:42,
}))}}/></main>);
