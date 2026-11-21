export type TrainingTest = {
  state: 'not_started' | 'incomplete' | 'submitted'; score: number | null;
  form_id: string | null; release_id: string | null; source: 'snapshot' | 'legacy' | null;
  submitted_at: string | null; submitted_count: number;
};
export type TrainingMonitoring = {
  lessons_done: number; lessons_total: number; practice_completed: number;
  tests: {pretest: TrainingTest; posttest: TrainingTest}; topics_available: boolean;
  topics: {lesson_key: string; title_fil: string; title_en: string; total: number; missed: number}[];
};

export function TrainingPageSummary({rows, locale}: {rows: {training?: TrainingMonitoring}[]; locale: string}) {
  const en = locale === 'en';
  const available = rows.filter(row => row.training);
  const count = (state: TrainingTest['state']) => available.filter(row => row.training!.tests.posttest.state === state).length;
  return <aside className="mt-4 space-y-2 rounded-md border border-ink/20 p-4" aria-label={en ? 'Training summary for this page' : 'Buod ng pagsasanay sa pahinang ito'}>
    <h3 className="font-semibold">{en ? `Post-test status · ${available.length}/${rows.length} displayed BHWs with monitoring data` : `Katayuan ng post-test · ${available.length}/${rows.length} ipinapakitang BHW na may datos`}</h3>
    <p>{en ? `Not started: ${count('not_started')} · Incomplete: ${count('incomplete')} · Submitted: ${count('submitted')}`
      : `Hindi pa nagsimula: ${count('not_started')} · Hindi pa tapos: ${count('incomplete')} · Naisumite: ${count('submitted')}`}</p>
    <p className="text-sm text-ink/75">{en
      ? 'Counts cover this page and its filters, not the whole catchment. Scores show the earliest retained submitted test in each phase; deleted or reset history cannot be reconstructed. Practice is separate. Different forms are not treated as a learning-gain measure.'
      : 'Para lamang sa pahinang ito at sa mga filter ang bilang, hindi sa buong saklaw. Mula sa pinakaunang natitirang naisumiteng pagsusulit sa bawat yugto ang iskor; hindi maibabalik ang nabura o ni-reset na kasaysayan. Hiwalay ang pagsasanay. Hindi sukatan ng pag-unlad ang paghahambing ng magkaibang form.'}</p>
    <p className="text-sm text-ink/75">{en ? 'Topics needing follow-up suggest where to offer support; they do not determine competence or assessment readiness.'
      : 'Ipinapahiwatig ng mga paksang dapat balikan kung saan maaaring tumulong; hindi nito tinutukoy ang kakayahan o kahandaan sa pagtatasa.'}</p>
  </aside>;
}

export function LearnerTrainingMonitoring({data, locale}: {data?: TrainingMonitoring; locale: string}) {
  const en = locale === 'en';
  if (!data) return <p className="text-sm">{en ? 'Training details unavailable.' : 'Hindi makuha ang detalye ng pagsasanay.'}</p>;
  const status = (test: TrainingTest) => test.state === 'submitted'
    ? `${en ? 'Submitted' : 'Naisumite'} · ${test.score ?? '—'}%`
    : test.state === 'incomplete' ? (en ? 'Incomplete — no submitted score' : 'Hindi pa tapos — wala pang naisumiteng iskor')
      : (en ? 'Not started' : 'Hindi pa nagsimula');
  const followups = data.topics.filter(topic => topic.missed > 0);
  return <div className="mt-3 min-w-0 space-y-3 break-words text-sm">
    <p>{en ? 'Recorded required lessons' : 'Naitalang kinakailangang aralin'}: {data.lessons_done}/{data.lessons_total}</p>
    <dl className="space-y-2">{(['pretest','posttest'] as const).map(phase => {
      const test = data.tests[phase];
      return <div key={phase}>
        <dt className="font-semibold">{phase === 'pretest' ? 'Pre-test' : 'Post-test'}</dt>
        <dd>{status(test)}{test.state === 'submitted' && <>
          <span className="block">{en ? 'Retained submissions' : 'Natitirang naisumiteng pagsusulit'}: {test.submitted_count}</span>
          <span className="block">{test.source === 'legacy' ? (en ? 'Historical result — original topic mapping unavailable' : 'Dating resulta — wala ang orihinal na ugnayan sa paksa')
            : `${en ? 'Form / release' : 'Form / bersyon'}: ${test.form_id} / ${test.release_id}`}</span>
        </>}</dd>
      </div>;
    })}</dl>
    <p>{en ? 'Completed practice checkpoints (separate)' : 'Natapos na checkpoint sa pagsasanay (hiwalay)'}: {data.practice_completed}</p>
    {data.tests.posttest.state === 'submitted' && <details className="rounded-md border border-ink/20 p-3">
      <summary className="min-h-11 cursor-pointer py-2 font-medium">{en ? 'Topics needing follow-up' : 'Mga paksang dapat balikan'}{data.topics_available ? ` (${followups.length})` : ''}</summary>
      {!data.topics_available || data.topics.length === 0 ? <p>{en ? 'Original topic mapping is unavailable for this result.' : 'Wala ang orihinal na ugnayan sa paksa para sa resultang ito.'}</p>
        : <>
          <p className="mb-3">{en ? 'From the earliest retained post-test only. Each count is responses needing review / mapped questions. A question can belong to more than one topic; do not add topic counts together.'
            : 'Mula lamang sa pinakaunang natitirang post-test. Bawat bilang: sagot na dapat balikan / tanong na kaugnay ng paksa. Maaaring kabilang ang isang tanong sa higit sa isang paksa; huwag pagsamahin ang mga bilang.'}</p>
          {followups.length ? <ul className="space-y-2">{followups.map(topic => <li key={topic.lesson_key}>
            <span className="font-medium">{en ? topic.title_en : topic.title_fil}</span>: {topic.missed}/{topic.total}
          </li>)}</ul> : <p>{en ? 'No responses needing review among the mapped questions.' : 'Walang sagot na dapat balikan sa mga tanong na may ugnayan sa paksa.'}</p>}
        </>}
    </details>}
  </div>;
}
