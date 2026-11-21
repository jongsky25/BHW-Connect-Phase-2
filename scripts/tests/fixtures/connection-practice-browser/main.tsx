import {createRoot} from 'react-dom/client';
import {AssessorConnectionPractice} from '../../../../src/components/elearning/assessor-connection-practice';
import '../../../../src/app/globals.css';
const params=new URLSearchParams(location.search);
const locale=params.get('locale')??'en';
document.documentElement.lang=locale;
document.documentElement.dataset.theme=params.get('theme')??'light';
document.documentElement.style.fontSize='200%';
createRoot(document.getElementById('app')!).render(<main className="mx-auto max-w-3xl px-4 py-8"><h1>{locale==='en'?'Assessor practice':'Pagsasanay ng assessor'}</h1><AssessorConnectionPractice programId="fictional" locale={locale}/></main>);
