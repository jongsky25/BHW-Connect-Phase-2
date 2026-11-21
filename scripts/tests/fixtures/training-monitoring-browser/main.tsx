import {createRoot} from 'react-dom/client';
import {LearnerTrainingMonitoring,TrainingPageSummary,type TrainingMonitoring} from '../../../../src/components/elearning/chapter1-training-monitoring';
import '../../../../src/app/globals.css';
const params=new URLSearchParams(location.search);
const locale=params.get('locale')??'en';
document.documentElement.lang=locale;
document.documentElement.dataset.theme=params.get('theme')??'light';
document.documentElement.style.fontSize='200%';
const test={state:'submitted' as const,score:0,form_id:'chapter1-posttest-original-retained-form',release_id:'chapter1-feedback-needlestick-context-v8',source:'snapshot' as const,submitted_count:2,submitted_at:'2026-10-02'};
const data:TrainingMonitoring={lessons_done:2,lessons_total:42,practice_completed:1,tests:{pretest:test,posttest:test},topics_available:true,
  topics:[{lesson_key:'infection-control',title_en:'Infection prevention and control in the household',title_fil:'Pag-iwas at pagkontrol ng impeksyon sa sambahayan',missed:2,total:3}]};
createRoot(document.getElementById('app')!).render(<main className="mx-auto max-w-3xl space-y-4 break-words px-4 py-8">
  <h1>{locale==='en'?'Chapter 1 training monitoring':'Pagsubaybay sa pagsasanay sa Kabanata 1'}</h1>
  <TrainingPageSummary rows={[{training:data}]} locale={locale}/>
  <section className="rounded-md border border-ink/20 p-4"><h2>Fictional BHW</h2><LearnerTrainingMonitoring data={data} locale={locale}/></section>
</main>);
