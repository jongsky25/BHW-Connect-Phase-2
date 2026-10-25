import React from 'react';
import {createRoot} from 'react-dom/client';
import {NextIntlClientProvider} from 'next-intl';
import {Chapter1Assessment} from '../../../../src/components/elearning/chapter1-assessment';
import {ManualLesson} from '../../../../src/components/elearning/manual-lesson';
import TrainingLoading from '../../../../src/app/training/loading';
import type {ReferenceData} from '../../../../src/components/elearning/reference-lessons';
import {createClient} from './client';
import en from '../../../../messages/en.json';
import fil from '../../../../messages/fil.json';
import '../../../../src/app/globals.css';

const query = new URLSearchParams(location.search);
const lang = query.get('lang') === 'fil' ? 'fil' : 'en';
document.documentElement.lang = lang;
document.documentElement.dataset.fontScale = 'xl';
document.documentElement.dataset.theme = lang === 'en' ? 'light' : 'dark';
const sections = ['first', 'second', 'last'].map(id => ({id, concept_ids: ['concept'], asset_ids: [],
  heading_en: `${id} section`, heading_fil: `Bahagi: ${id}`, body_en: `Previously loaded ${id} lesson text.`,
  body_fil: `Nakabukas nang teksto ng aralin: ${id}.`, check: null}));
const data = {title_en: 'Local manual', title_fil: 'Lokal na manwal', chapters: [], lessons: [{
  id: 'lesson', module_id: 'module', lesson_key: 'connection-fixture', position: 0, required: true,
  title_en: 'Local lesson', title_fil: 'Lokal na aralin', objectives_en: ['Read the fixture'], objectives_fil: ['Basahin ang fixture'],
  revision: {id: 'revision', read_sections: sections, slides: sections.map(s => ({...s, layout: 'scene',
    display_en: s.body_en, display_fil: s.body_fil})), assets: [], sources: []}}]} as unknown as Omit<ReferenceData, 'completed' | 'resumes'>;
function App() {
  const [state, setState] = React.useState<{resumes: ReferenceData['resumes']; completed: ReferenceData['completed']} | null>(null);
  React.useEffect(() => {void createClient().rpc('fixture_state', {}).then(({data}) => setState(data));}, []);
  return <NextIntlClientProvider locale={lang} messages={lang === 'en' ? en : fil}>
    {!state ? <TrainingLoading/> : <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      {query.get('mode') === 'lesson' ? <ManualLesson data={{...data, ...state}} modules={[]} lessonId="lesson"
        baseHref="/lesson" locale={lang} readOnly={false} lessonNumber={1} lessonCount={1}/>
        : <Chapter1Assessment courseId="fixture" chapterHref="#chapter" locale={lang} sessionId={null}
          completed contentApproved initialState={{attempts: [{attempt_id: 'draft', phase: 'pretest', state: 'draft',
            score_percent: null, legacy_attempt_id: null}], final_attempts: []}}
          orientation={{expectations: {en: '', fil: ''}, overview: {en: '', fil: ''}, recap: {en: '', fil: ''}}}/>}
    </main>}
  </NextIntlClientProvider>;
}
createRoot(document.getElementById('app')!).render(<App/>);
