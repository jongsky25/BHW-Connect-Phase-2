import content from '@/lib/elearning/chapter1-reading-support.json';

const terms: Record<string, {label: string; fil: string; en: string}> = content.terms;
const lessons: Record<string, string[]> = content.lessons;

/** Editorial help for lesson reading only; never used by assessment runners. */
export function Chapter1ReadingSupport({lessonKey, locale}: {lessonKey: string; locale: string}) {
  const ids = Object.hasOwn(lessons, lessonKey) ? lessons[lessonKey] : [];
  if (!ids.length) return null;
  const en = locale === 'en';
  return <details className="my-4 rounded-xl border border-ink/20 bg-canvas p-4 sm:p-6" lang={en ? 'en' : 'fil'}>
    <summary className="min-h-11 cursor-pointer py-2 text-lg font-semibold">
      {en ? 'Words used in this lesson' : 'Mga salitang gamit sa aralin'}
    </summary>
    <div className="mt-4 space-y-4 break-words">
      <p>{en
        ? 'These short explanations help you read the lesson. They are written for this course and are separate from the manual quotations.'
        : 'Makakatulong ang maiikling paliwanag na ito sa pagbasa ng aralin. Isinulat ang mga ito para sa kursong ito; hiwalay ang mga ito sa sipi ng manual.'}</p>
      <dl className="space-y-4">{ids.map(id => <div key={id}>
        <dt className="font-semibold" lang="en">{terms[id].label}</dt>
        <dd className="mt-1 leading-relaxed">{en ? terms[id].en : terms[id].fil}</dd>
      </div>)}</dl>
      <p className="text-sm">{en
        ? 'You can return to this help at any time. Opening it does not mark the lesson complete or count as an assessment.'
        : 'Maaari mong balikan ang tulong na ito anumang oras. Hindi nito minamarkahang tapos ang aralin at hindi ito pagsusulit.'}</p>
    </div>
  </details>;
}
