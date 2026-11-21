import {createRoot} from 'react-dom/client';
import ReviewPage from '../../../../src/app/courses/[id]/assessment/review/[attemptId]/page';
import '../../../../src/app/globals.css';
const params = new URLSearchParams(location.search);
document.documentElement.lang = params.get('locale') ?? 'en';
document.documentElement.dataset.theme = params.get('theme') ?? 'light';
document.documentElement.style.fontSize = '200%';
const page = await ReviewPage({params:Promise.resolve({id:'course',attemptId:'final'}),searchParams:Promise.resolve({view:'needs-review'})});
createRoot(document.getElementById('app')!).render(page);
