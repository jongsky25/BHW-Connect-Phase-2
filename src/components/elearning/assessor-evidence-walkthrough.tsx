'use client';

import {useState} from 'react';

/** Fictional, unsaved demonstration. No learner IDs, storage or network calls. */
export function AssessorEvidenceWalkthrough({locale}: {locale: string}) {
  const [example, setExample] = useState<'observed' | 'missing'>('observed');
  const text = (fil: string, en: string) => locale === 'en' ? en : fil;
  return <section className="rounded-xl border border-ink/20 p-5" aria-labelledby="evidence-example-title">
    <h2 id="evidence-example-title" className="text-lg font-semibold">{text('Halimbawa ng pagtatala ng ebidensya', 'Evidence-entry walkthrough')}</h2>
    <p className="mt-2">{text('Kathang-isip na practice nina assessor Alex at BHW Rosa. Walang tunay na rekord na binabasa o sine-save dito. Huwag maglagay ng personal na impormasyon ng BHW o pasyente.', 'Fictional practice with assessor Alex and BHW Rosa. No real records are read or saved here. Do not enter personal BHW or patient information.')}</p>
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={text('Pumili ng halimbawa', 'Choose an example')}>
      <button type="button" aria-pressed={example === 'observed'} onClick={() => setExample('observed')} className="min-h-11 rounded border border-ink/20 px-3 py-2">{text('May naobserbahang gawain', 'Observed performance')}</button>
      <button type="button" aria-pressed={example === 'missing'} onClick={() => setExample('missing')} className="min-h-11 rounded border border-ink/20 px-3 py-2">{text('Kulang ang ebidensya', 'Insufficient evidence')}</button>
    </div>
    <div className="mt-4 space-y-3" aria-live="polite">
      <p className="font-semibold">{text('SAMPLE lamang — hindi naka-save', 'SAMPLE only — not saved')}</p>
      <dl className="space-y-3">
        <div><dt className="font-medium">{text('Konteksto', 'Context')}</dt><dd>{text('12 Oktubre 2026, kathang-isip na role-play sa BHS; practice sa pakikinig, hindi pormal na pagtatasa.', '12 October 2026, fictional BHS role-play; listening practice, not a formal assessment.')}</dd></div>
        <div><dt className="font-medium">{text('Naobserbahan at prompt', 'Observation and prompt')}</dt><dd>{example === 'observed'
          ? text('Nagsimulang magbigay ng payo si Rosa bago matapos ang residente. Sinabi ni Alex: “Huminto muna at pakinggan siya.” Pagkatapos, nagtanong si Rosa: “Ano ang concern ninyo?” at hinayaang matapos ang sagot.', 'Rosa began giving advice before the resident finished. Alex said, “Pause and listen first.” Rosa then asked, “What is your concern?” and let the resident finish.')
          : text('Nahinto ang role-play bago makapagtanong si Rosa. Hindi naobserbahan ang pakikinig o tugon niya; walang prompt na naibigay.', 'The role-play stopped before Rosa could ask a question. Her listening and response were not observed; no prompt was given.')}</dd></div>
        <div><dt className="font-medium">{text('Ebidensya, hindi hula', 'Evidence, not inference')}</dt><dd>{text('Itala ang sinabi, ginawa at tulong na ibinigay. Ang “walang pakialam si Rosa” ay hula tungkol sa motibo, hindi obserbasyon.', 'Record words, actions and help given. “Rosa does not care” guesses at motivation; it is not an observation.')}</dd></div>
        <div><dt className="font-medium">{text('Desisyon at follow-up', 'Decision and follow-up')}</dt><dd>{example === 'observed'
          ? text('Ihambing sa eksaktong anchor ng pakikinig: nagtanong nang bukas matapos paalalahanan. Ipaliwanag nang pribado ang pangangailangan ng practice at magtakda ng panibagong obserbasyon nang walang prompt.', 'Compare with the exact listening anchor: an open question followed a reminder. Explain the practice need privately and arrange another observation without prompting.')
          : text('Hindi pa naobserbahan — walang marka. Hindi katumbas ng “Hindi pa” ang kulang na ebidensya. Magtakda ng bagong pagkakataong maobserbahan ang buong gawain.', 'Not yet observed — no rating. Missing evidence is not “Hindi pa”. Arrange a new opportunity to observe the full task.')}</dd></div>
      </dl>
    </div>
    <p className="mt-4 text-sm">{text('Sa tunay na assessment workflow, suriin ang BHW, gawain, indicator at rubric version bago ang tahasang pag-save ng petsa, konteksto, ebidensya, prompt at follow-up sa awtorisadong rekord. Hiwalay ang practice sa pormal na ebidensya; hindi ito awtomatikong inililipat. Dito, ang Mark lesson complete ay nagtatala lamang ng iyong aralin at ang Submit ratings ay nagtatala ng iyong scoring attempt.', 'In the real assessment workflow, check the BHW, task, indicator and rubric version before explicitly saving the date, context, evidence, prompts and follow-up to the authorized record. Practice stays separate from formal evidence and is not transferred automatically. Here, Mark lesson complete saves only your lesson progress; Submit ratings saves your scoring attempt.')}</p>
  </section>;
}
