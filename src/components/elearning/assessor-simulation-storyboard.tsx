'use client';

import {useRef, useState} from 'react';
import lessonRubric from '../../../content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-clarify/competency.json';
import {chapterComponents, modelNote, practiceFacts, preparation, simulationStory, storyScenes, type StoryText} from '../../lib/assessor/simulation-storyboard';
import {chapter1Terms,checkpointParity} from '../../lib/assessor/chapter1-workflow-parity';

/** Review-only component, mounted by the local fixture. No app route, storage, identity or RPC. */
export function AssessorSimulationStoryboard() {
  const [locale, setLocale] = useState<'en' | 'fil'>('en');
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<Record<string, string[]>>({});
  const [hints, setHints] = useState<Record<string, boolean>>({});
  const [facts, setFacts] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [guide, setGuide] = useState<'closed' | 'guide' | 'learner'>('closed');
  const [guideVisited, setGuideVisited] = useState(false);
  const [learnerVisited, setLearnerVisited] = useState(false);
  const [returned, setReturned] = useState(false);
  const [validation, setValidation] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const text = (value: StoryText) => value[locale];
  const label = (en: string, fil: string) => locale === 'en' ? en : fil;
  const current = storyScenes[index];
  const parity = checkpointParity[current.id as keyof typeof checkpointParity];
  const complete = (id: string) => storyScenes.find(s => s.id === id)!.choices.some(c => c.correct && (attempts[id] ?? []).includes(c.id));
  const count = storyScenes.filter(s => complete(s.id)).length;
  const last = current.choices.find(c => c.id === attempts[current.id]?.at(-1));
  const needsEvidence = current.id === 'observe';
  const needsGuide = current.id === 'prepare';
  const ready = (!needsEvidence || (facts.length === practiceFacts.length && note.trim().length > 0)) && (!needsGuide || returned);
  const rubric = lessonRubric.observation_indicators[0];
  const select = (id: string) => {
    if (!ready) { setValidation(true); return; }
    setValidation(false);
    setAttempts(previous => ({...previous, [current.id]: [...(previous[current.id] ?? []), id]}));
  };
  const navigate = (next: number) => {
    setIndex(next); setValidation(false);
    // The heading persists across scenes; focus announces the newly rendered scene.
    requestAnimationFrame(() => heading.current?.focus());
  };
  return <main className="simulation-storyboard" lang={locale}>
    <header>
      <p>C1AF-06a · {simulationStory.version}</p>
      <h1>{text(simulationStory.title)}</h1>
      <div role="group" aria-label={label('Language', 'Wika')}>
        <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>English</button>
        <button type="button" aria-pressed={locale === 'fil'} onClick={() => setLocale('fil')}>Filipino</button>
      </div>
      <p className="notice">{text(simulationStory.boundary)}</p>
      <p>{text(simulationStory.review)}</p>
      <p>{label('Allow about 15–20 minutes; no time limit. This estimate still needs usability review. Hints and retries are unlimited.', 'Maglaan ng mga 15–20 minuto; walang time limit. Kailangan pa ng usability review ang pagtatayang ito. Walang limitasyon ang hints at retries.')}</p>
    </header>
    <nav aria-label={label('Story scenes', 'Mga scene ng kuwento')}>
      <ol>{storyScenes.map((s, i) => <li key={s.id}>
        <button type="button" aria-current={i === index ? 'step' : undefined} onClick={() => navigate(i)}>
          {i + 1}. {text(s.title)} {complete(s.id) ? '✓' : ''}
          <span className="sr-only"> — {complete(s.id) ? label('Reviewed', 'Nasuri') : label('Pending', 'Nakabinbin')}</span>
        </button>
      </li>)}</ol>
    </nav>
    <p>{label('Local review checklist', 'Lokal na checklist ng review')}: {count}/{storyScenes.length}. {label('Scene navigation does not complete checkpoints.', 'Hindi natatapos ang checkpoints sa paglipat lamang ng scene.')}</p>
    <section aria-labelledby="story-scene-title">
      <h2 ref={heading} tabIndex={-1} id="story-scene-title">{index + 1}. {text(current.title)}</h2>
      <p className="notice">{label('Fictional screen adapter. The working flow below describes current screens; no real learner data is opened here.', 'Kathang-isip na screen adapter. Inilalarawan sa ibaba ang kasalukuyang working flow; walang tunay na learner data na binubuksan dito.')}</p>
      <section aria-label={label('Current working flow','Kasalukuyang working flow')}>
        <h3>{text(parity.surface)}</h3><p>{text(parity.state)}</p>
        <p>{label('Controls and fields:','Mga control at field:')} {parity.actions.map(action=>text(action)).join(' → ')}</p>
      </section>
      <p className="evidence">{text(current.evidence)}</p>
      {needsGuide && <section aria-label={label('Preparation views', 'Mga view sa paghahanda')}>
        <button type="button" aria-pressed={guide === 'guide'} onClick={() => {setGuide('guide'); setGuideVisited(true); if (learnerVisited) setReturned(true);}}>{label('Open / return to Prepare', 'Buksan / bumalik sa Ihanda')}</button>
        <button type="button" disabled={!guideVisited} aria-pressed={guide === 'learner'} onClick={() => {setGuide('learner'); setLearnerVisited(true);}}>{text(chapter1Terms.bhwView)}</button>
        {guide === 'guide' && <p>{text(preparation.guide)}</p>}
        {guide === 'learner' && <p>{text(preparation.learner)}</p>}
      </section>}
      {(needsGuide && guide === 'guide' || needsEvidence || current.id === 'formal') && <section aria-label={label('Source lesson criterion', 'Source criterion ng aralin')}>
        <h3>{label('1.6.2 source lesson criterion — rehearsal only', 'Source criterion ng aralin 1.6.2 — pagsasanay lamang')}</h3>
        <p>{rubric[`observable_${locale}`]}</p>
        <dl>{(['kaya_na', 'kailangan_practice', 'hindi_pa'] as const).map(level => <div key={level}>
          <dt>{level === 'kaya_na' ? 'Kaya na' : level === 'kailangan_practice' ? 'Kailangan practice' : 'Hindi pa'}</dt>
          <dd>{rubric.levels[`${level}_${locale}`]}</dd>
        </div>)}</dl>
        <p>{label('Provenance: communication-clarify/competency.json, local indicator 0; not legacy module indicator 0. Component mapping is unapproved.', 'Pinagmulan: communication-clarify/competency.json, local indicator 0; hindi legacy module indicator 0. Hindi aprubado ang component mapping.')}</p>
      </section>}
      {needsEvidence && <fieldset>
        <legend>{label('Select the observed facts, including the prompt', 'Piliin ang nasaksihang katotohanan, kasama ang prompt')}</legend>
        {practiceFacts.map((fact, i) => <label className="fact" key={i}><input type="checkbox" checked={facts.includes(i)} onChange={event => setFacts(previous => event.target.checked ? [...previous, i] : previous.filter(value => value !== i))} />{text(fact)}</label>)}
        <label htmlFor="private-story-note">{label('Fictional observed facts note — no real learner details', 'Kathang-isip na tala ng nasaksihan — walang tunay na detalye ng BHW')}</label>
        <textarea id="private-story-note" maxLength={1200} value={note} onChange={event => setNote(event.target.value)} />
        <details><summary>{label('Compare with a model note', 'Ihambing sa modelong tala')}</summary><p>{text(modelNote)}</p></details>
        <p>{label('The check requires selected facts and a nonempty note; it does not judge the meaning or quality of your writing. Compare your note with the model.', 'Kailangan sa check ang napiling katotohanan at talang may laman; hindi nito hinuhusgahan ang kahulugan o kalidad ng iyong sulat. Ihambing ang tala sa modelo.')}</p>
      </fieldset>}
      {(current.id === 'chapter-gap' || current.id === 'final-review') && <section aria-label={label('Fictional chapter record', 'Kathang-isip na chapter record')}>
        <h3>{current.id === 'chapter-gap' ? label('Incomplete SAMPLE record', 'Hindi kumpletong SAMPLE record') : label('Separate complete SAMPLE record', 'Hiwalay na kumpletong SAMPLE record')}</h3>
        <ul>{chapterComponents.map((component, i) => <li key={component.en}>{text(component)}: {i === 8 && current.id === 'chapter-gap' ? label('Missing evidence — no grade', 'Kulang ang ebidensya — walang marka') : label('Assumed satisfied in this fixture only', 'Ipinagpapalagay na sapat sa fixture na ito lamang')}</li>)}</ul>
        <p>{label('Learner prerequisites, compatible versions and current assessor permission: assumed satisfied in this record only. No staff post-test threshold is imposed on Maria.', 'Learner prerequisites, compatible versions at kasalukuyang pahintulot ng assessor: ipinagpapalagay na sapat sa rekord na ito lamang. Walang staff post-test threshold na ipinapataw kay Maria.')}</p>
      </section>}
      <fieldset>
        <legend>{text(current.question)}</legend>
        <div className="choices">{current.choices.map(c => <button key={c.id} type="button" onClick={() => select(c.id)}>{text(c.text)}</button>)}</div>
      </fieldset>
      <button type="button" aria-expanded={!!hints[current.id]} onClick={() => setHints(previous => ({...previous, [current.id]: !previous[current.id]}))}>{label('Show / hide hint', 'Ipakita / itago ang hint')}</button>
      {hints[current.id] && <p>{text(current.hint)}</p>}
      <div role="status" aria-live="polite">
        {validation ? <p>{label('First inspect both preparation views and return to the guide, or select all observed facts and add a private note for the evidence task.', 'Suriin muna ang dalawang preparation view at bumalik sa gabay, o piliin ang lahat ng nasaksihang katotohanan at magdagdag ng pribadong tala para sa evidence task.')}</p> : last && <p><strong>{last.correct ? label('Checkpoint reviewed.', 'Nasuri ang checkpoint.') : label('Try again — your earlier choice is retained.', 'Subukan muli — pinanatili ang naunang pinili.')}</strong> {text(last.explanation)}</p>}
      </div>
      {current.id === 'final-review' && complete(current.id) && <aside className="sample" aria-label={label('Sample certificate', 'Sample na sertipiko')}>
        <h3>SAMPLE — {label('BHW Chapter 1', 'BHW Kabanata 1')}</h3>
        <p>{label('Fictional Maria · layout preview only. Issuer/signatory pending. No certificate number, signature, QR code or verification URL. Not a staff award or overall certificate.', 'Kathang-isip na Maria · layout preview lamang. Nakabinbin ang issuer/signatory. Walang certificate number, lagda, QR code o verification URL. Hindi staff award o overall certificate.')}</p>
      </aside>}
      <div className="navigation">
        <button type="button" disabled={index === 0} onClick={() => navigate(index - 1)}>{label('Previous scene', 'Nakaraang scene')}</button>
        <button type="button" disabled={!complete(current.id) || index === storyScenes.length - 1} onClick={() => navigate(index + 1)}>{label('Next scene', 'Susunod na scene')}</button>
      </div>
    </section>
    <section aria-labelledby="story-debrief">
      <h2 id="story-debrief">{label('Debrief and completion checklist', 'Debrief at checklist ng completion')}</h2>
      <p>{count === storyScenes.length ? label('All local checkpoints reviewed. This is not a saved simulation completion. Revised certification remains unavailable pending review and the later server-validated runner.', 'Nasuri ang lahat ng lokal na checkpoint. Hindi ito naka-save na simulation completion. Unavailable pa rin ang revised certification habang nakabinbin ang review at susunod na server-validated runner.') : label('Review each essential checkpoint. Hints and corrected mistakes do not penalize you.', 'Suriin ang bawat essential checkpoint. Walang parusa sa hints at naiwastong pagkakamali.')}</p>
      <ol>{storyScenes.map(s => <li key={s.id}>
        {text(s.title)}: {complete(s.id) ? label('Reviewed', 'Nasuri') : label('Pending', 'Nakabinbin')}
        {(attempts[s.id] ?? []).some(id => !s.choices.find(c => c.id === id)?.correct) && <details><summary>{label('Review earlier choices and corrections', 'Suriin ang naunang pinili at pagwawasto')}</summary><ol>{attempts[s.id].map((id, i) => {
          const c = s.choices.find(value => value.id === id)!;
          return <li key={i}>{text(c.text)} — {text(c.explanation)}</li>;
        })}</ol></details>}
      </li>)}</ol>
      <p>{label('Return to the preparation guide and source anchors in scene 2, evidence and model note in scene 4, or readiness checks in scene 7 using the scene navigation. This storyboard does not read your real preparation state. Existing passes, progress and qualification history remain unchanged. Chapter 3 is unavailable; overall certification needs three compatible chapter awards, with no additional overall exam.', 'Gamitin ang scene navigation para balikan ang gabay at source anchors sa scene 2, ebidensya at modelong tala sa scene 4, o readiness checks sa scene 7. Hindi binabasa ng storyboard ang tunay mong preparation state. Hindi nagbabago ang naunang passes, progress at qualification history. Unavailable ang Kabanata 3; kailangan ng overall certification ang tatlong compatible na chapter awards, walang dagdag na overall exam.')}</p>
    </section>
  </main>;
}
