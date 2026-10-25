import React from 'react';
import {createRoot} from 'react-dom/client';
import {NextIntlClientProvider} from 'next-intl';
import {Chapter1Assessment} from '../../../../src/components/elearning/chapter1-assessment';
import {TestQuestionFields} from '../../../../src/components/elearning/pre-post-test';
import {QuickDisplayControls} from '../../../../src/components/nav/quick-display-controls';
import {SegmentedRadioGroup} from '../../../../src/components/settings/segmented-radio-group';
import {useDisplaySettings} from '../../../../src/lib/settings/use-display-settings';
import {defaultA11ySettings, fontScales} from '../../../../src/lib/settings/types';
import en from '../../../../messages/en.json';
import fil from '../../../../messages/fil.json';
import {items, calls} from './client';
import '../../../../src/app/globals.css';

const query = new URLSearchParams(location.search);
const lang = query.get('lang') === 'fil' ? 'fil' : 'en';
const phase = query.get('phase') === 'posttest' ? 'posttest' : 'pretest';
const messages = lang === 'en' ? en : fil;
document.documentElement.lang = lang;
document.documentElement.dataset.theme = query.get('theme') === 'dark' ? 'dark' : 'light';
// Expose only geometry-case indexes and call names, never assessment keys.
Object.assign(window, {readability: {indexes: [...new Set([0,
  ...[(i: typeof items[number]) => i.stem[lang].length,
    (i: typeof items[number]) => Math.max(...i.options.map(o => o.label[lang].length))]
    .map(size => items.reduce((max, item, index) => size(item) > size(items[max]) ? index : max, 0))])], calls}});

function App() {
  const display = useDisplaySettings({...defaultA11ySettings,
    theme: query.get('theme') === 'dark' ? 'dark' : 'light'}, true);
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const sizeLabels = {sm: messages.settings.fontScaleSm, md: messages.settings.fontScaleMd,
    lg: messages.settings.fontScaleLg, xl: messages.settings.fontScaleXl};
  return <NextIntlClientProvider locale={lang} messages={messages}>
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <section data-quick><QuickDisplayControls a11y={display.a11y} update={display.update}/></section>
      <section data-full-font><SegmentedRadioGroup legend={messages.settings.fontScaleLabel}
        name="font-scale" options={fontScales} value={display.a11y.font_scale}
        onChange={font_scale => display.update({font_scale})} labelFor={size => sizeLabels[size]}/></section>
      <div data-assessment><Chapter1Assessment courseId="readability" chapterHref="/chapter" locale={lang}
        sessionId={null} completed contentApproved initialState={{attempts: [{attempt_id: 'readability', phase,
          state: 'draft', score_percent: null, legacy_attempt_id: null}], final_attempts: phase === 'posttest'
          ? [{id: 'pre', phase: 'pretest', score_percent: 0}] : []}}
        orientation={{expectations: {en: '', fil: ''}, overview: {en: '', fil: ''}, recap: {en: '', fil: ''}}}/></div>
      <section data-legacy><h2>Shared legacy question controls</h2><TestQuestionFields locale={lang}
        questions={[...items].sort((a, b) => b.stem[lang].length - a.stem[lang].length).slice(0, 3)
          .map(i => ({id: i.item_id, prompt_en: i.stem.en, prompt_fil: i.stem.fil, options: i.options.map(o => o.label)}))}
        answers={answers} onAnswer={(id, option) => setAnswers(previous => ({...previous, [id]: option}))}
        disabled={false} namePrefix="readability"/></section>
    </main>
  </NextIntlClientProvider>;
}
createRoot(document.getElementById('app')!).render(<App/>);
