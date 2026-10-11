'use client';

import {useId, useState} from 'react';

type Localized = {fil: string; en: string};
type TourStep = {id: string; title: Localized; where: Localized; assessor: Localized;
  bhw: Localized; action: Localized; example: Localized};
const local = (fil: string, en: string): Localized => ({fil, en});
const steps: TourStep[] = [
  {id: 'study', title: local('Sariling pag-aaral', 'Personal study'),
    where: local('Training → BHW Reference Manual → Sariling pag-aaral ng assessor → Kabanata 1', 'Training → BHW Reference Manual → Assessor personal study → Chapter 1'),
    assessor: local('Binubuksan ni Alex ang sariling pag-aaral, kinukuha ang diagnostic pretest, at ipinagpapatuloy ang mga aralin. Sarili niyang paghahanda ito, hindi progreso ni Rosa.', 'Alex opens personal study, takes the diagnostic pretest, and continues the lessons. This is Alex’s preparation, not Rosa’s progress.'),
    bhw: local('Hindi pa kasali si Rosa sa hakbang na ito. Hiwalay ang kanyang pag-aaral at ebidensiya.', 'Rosa is not involved in this step. Her study and evidence are separate.'),
    action: local('Ipakita ang halimbawa ng sariling pag-aaral', 'Show personal study example'),
    example: local('Halimbawa: sariling progreso ni Alex ang nakikita rito. Ipagpatuloy ang kinakailangang aralin at paghahanda; walang aralin ni Rosa na mamamarkahang tapos.', 'Example: this area shows Alex’s own progress. Continue the required lessons and preparation; no lesson is marked complete for Rosa.')},
  {id: 'prepare', title: local('Ihanda ang aralin', 'Prepare the lesson'),
    where: local('Kabanata 1 → Epektibong Komunikasyon → Aralin sa pakikinig → Gabay ng facilitator', 'Chapter 1 → Effective Communication → Listening lesson → Facilitator guide'),
    assessor: local('Para sa natitirang halimbawa, ipagpalagay na may balidong awtorisasyon si Alex para sa Kabanata 1. Sinusuri niya ang layunin, gabay, gawain, at pamantayan bago ang sesyon.', 'For the remaining example, assume Alex has current Chapter 1 authorization. Alex reviews the objective, guide, activity, and criteria before the session.'),
    bhw: local('Sinasabi ni Rosa kung saan siya nahihirapan sa pakikinig upang maangkop ang pagsasanay.', 'Rosa shares where listening is difficult so practice can address her needs.'),
    action: local('Buksan ang halimbawang plano', 'Open example plan'),
    example: local('Plano: magsanay sa pakikinig at pagbubuod ng sinabi ng kausap. Ihanda ang kathang-isip na sitwasyon, tanong, at feedback. Ang sariling plano ay hindi pa tala ng naipadaloy na sesyon.', 'Plan: practise listening and summarizing what another person said. Prepare a fictional situation, questions, and feedback. A private plan is not yet a delivered-session record.')},
  {id: 'present', title: local('Ipakita ang aralin sa BHW', 'Present the BHW lesson'),
    where: local('Aralin → nilalamang para sa BHW; Training sessions → napiling sesyon kapag available at awtorisado', 'Lesson → learner content; Training sessions → selected session when available and authorized'),
    assessor: local('Ipinapakita ni Alex ang nilalaman ng aralin at ipinapaliwanag ang layunin. Pinananatiling pribado ang mga tala at gabay ng facilitator.', 'Alex presents the lesson content and explains the objective. Private facilitator notes and guidance stay separate.'),
    bhw: local('Binabasa o pinanonood ni Rosa ang aralin at nagtatanong kung may hindi malinaw.', 'Rosa reads or watches the lesson and asks about anything unclear.'),
    action: local('Ipakita ang nakikita ni Rosa', 'Show Rosa’s example view'),
    example: local('Nakikita ni Rosa: aralin sa pakikinig at gawaing pagsasanay. Hindi kasama ang pribadong tala ni Alex. Ang pagdalo at pagtingin sa aralin ay hindi awtomatikong patunay ng kakayahan.', 'Rosa sees: the listening lesson and practice activity, without Alex’s private notes. Attendance and viewing the lesson do not automatically prove competence.')},
  {id: 'coach', title: local('Magpadaloy ng pagsasanay', 'Facilitate practice'),
    where: local('Gabay ng facilitator → gawain at feedback', 'Facilitator guide → activity and feedback'),
    assessor: local('Sinasabi ni Alex: “Pagsasanay ito. Maaari kitang gabayan.” Nagbibigay siya ng halimbawa at angkop na tanong bago magbigay ng feedback.', 'Alex says, “This is practice. I can guide you.” Alex models the task and asks appropriate questions before giving feedback.'),
    bhw: local('Sinusubukan ni Rosa na ibuod ang sinabi ng kausap. Kapag nangangailangan ng tulong, maaari siyang magtanong at umulit.', 'Rosa tries to summarize what the other person said. She can ask for help and try again.'),
    action: local('Ipakita ang halimbawang usapan', 'Show example exchange'),
    example: local('Alex: “Ano ang pangunahing sinabi niya?” Rosa: “Hirap siyang makarating sa health station.” Alex: “Paano mo kukumpirmahin na tama ang pagkaunawa mo?” Nagdagdag si Rosa ng tanong matapos ang gabay. May coaching ito; hindi pa pormal na pagpasa.', 'Alex: “What was the main point?” Rosa: “She has difficulty reaching the health station.” Alex: “How would you confirm you understood?” Rosa adds a question after the prompt. This was coached practice, not a formal pass.')},
  {id: 'observe', title: local('Itala ang obserbasyon sa practice', 'Record practice observation'),
    where: local('Gabay ng facilitator → BHW roster at obserbasyon', 'Facilitator guide → BHW roster and observations'),
    assessor: local('Pinipili ni Alex ang tamang BHW at pamantayan. Inilalarawan niya ang aktuwal na ginawa ni Rosa, tulong na ibinigay, at susunod na pagsasanay. Sa binagong daloy, malinaw na practice ang tala.', 'Alex selects the correct BHW and criterion. The note describes what Rosa did, the help given, and the next practice. In the revised flow, this record is explicitly practice.'),
    bhw: local('Naririnig ni Rosa ang malinaw na feedback: ano ang nagawa niya at ano pa ang dapat sanayin.', 'Rosa hears clear feedback about what she did and what needs further practice.'),
    action: local('Itala ang demo observation', 'Record demo observation'),
    example: local('Demo lamang: “Naibuod ni Rosa ang pangunahing sinabi. Nagtanong upang kumpirmahin ang pagkaunawa matapos ang isang prompt. Susunod: ulitin nang walang prompt.” Nasa walkthrough lamang ang tala; walang totoong rekord na na-save.', 'Demo only: “Rosa summarized the main point. She checked her understanding after one prompt. Next: repeat without the prompt.” This note stays inside the walkthrough; no real record is saved.')},
  {id: 'readiness', title: local('Suriin ang kahandaan sa pagtatasa', 'Check assessment readiness'),
    where: local('Mga obserbasyon at pamantayan → Assessments; bago ang pormal na gawain', 'Observations and criteria → Assessments; before the formal task'),
    assessor: local('Sinusuri ni Alex ang sariling awtorisasyon, saklaw ng BHW, kinakailangang ebidensiya, at pamantayan. Hindi sapat ang pagtatapos ng aralin o coached practice lamang.', 'Alex checks current authorization, BHW scope, required evidence, and criteria. Lesson completion or coached practice alone is insufficient.'),
    bhw: local('Kung may kulang, sinasabi kay Rosa ang kailangang dagdag na obserbasyon at kung paano ito kukunin.', 'If evidence is missing, Rosa is told what further observation is needed and how it will be collected.'),
    action: local('Suriin ang demo evidence', 'Check demo evidence'),
    example: local('Hindi pa handa sa pormal na pasya: may coached practice, ngunit kulang ang kinakailangang ebidensiya. Kumuha pa ng obserbasyon; huwag magbigay ng pass o fail dahil lamang may kulang. Maaari mong tingnan ang susunod na hakbang bilang halimbawa ng gagawin sa ibang pagkakataon.', 'Not ready for a formal decision: coached practice exists, but required evidence is missing. Obtain further observations; do not assign pass or fail just because evidence is missing. You can view the next step as an example of a later activity.')},
  {id: 'assess', title: local('Isagawa ang pormal na gawain', 'Conduct the formal task'),
    where: local('Pamantayan at obserbasyon → pormal na pagtatasa kapag handa at awtorisado', 'Criteria and observations → formal assessment when ready and authorized'),
    assessor: local('Sa ibang pagkakataon, kapag handa at awtorisado na, ipinapaliwanag ni Alex ang pormal na gawain at pinapayagang tulong bago magsimula. Itinatala niya ang bagong ebidensiya at inihahambing sa aprubadong pamantayan.', 'Later, when ready and authorized, Alex explains the formal task and permitted help before starting. Alex records new evidence and compares it with approved criteria.'),
    bhw: local('Alam ni Rosa na pormal na gawain ito. Ginagawa niya ang napagkasunduang gawain; hindi kinokopya ang resulta ng coached practice bilang pormal na resulta.', 'Rosa knows this is a formal task. She performs the agreed task; the coached-practice result is not copied into a formal result.'),
    action: local('Ipakita ang susunod na obserbasyon', 'Show later observation example'),
    example: local('Halimbawa: naibuod at kinumpirma ni Rosa ang sinabi nang walang prompt. Bagong ebidensiya ito para sa isang pamantayan lamang. Kailangan pa ring suriin ang lahat ng kinakailangang pamantayan; walang awtomatikong pass, pormal na pasya, o sertipikong ibinibigay sa demo.', 'Example: Rosa summarizes and confirms the message without a prompt. This is new evidence for one criterion only. All required criteria still need review; the demo issues no automatic pass, formal decision, or certificate.')},
  {id: 'followup', title: local('Feedback at susunod na hakbang', 'Feedback and follow-up'),
    where: local('Mga obserbasyon → follow-up; Assessments → pasya kapag sapat na ang lahat ng kinakailangan', 'Observations → follow-up; Assessments → decision when all requirements are sufficient'),
    assessor: local('Ipinapaliwanag ni Alex ang ebidensiya, anumang kakulangan, at susunod na gawain. Kung kailangan, naghahanda ng dagdag na pagsasanay o muling obserbasyon bago ang pormal na pasya.', 'Alex explains the evidence, any gaps, and the next activity. If needed, Alex arranges more practice or another observation before a formal decision.'),
    bhw: local('Nauunawaan ni Rosa kung ano ang nagawa niya, ano ang dapat pang ipakita, at kailan babalikan ang gawain.', 'Rosa understands what she demonstrated, what remains to be shown, and when the task will be revisited.'),
    action: local('Ipakita ang follow-up plan', 'Show follow-up plan'),
    example: local('Follow-up: balikan ang iba pang kinakailangang ebidensiya sa komunikasyon; magtakda ng susunod na gawain at ipaliwanag ang pamantayan. Ang pasya at anumang sertipiko ay mangangailangan ng buong ebidensiya at awtorisadong proseso. Natapos ang halimbawa; walang progreso o resulta na na-save.', 'Follow-up: review the other required communication evidence, schedule the next activity, and explain the criteria. A decision and any certificate require complete evidence and an authorized process. The example ends here; no progress or result is saved.')},
];

export function AssessorNavigationTour({locale}: {locale: string}) {
  const language = locale === 'en' ? 'en' : 'fil';
  const text = (value: Localized) => value[language];
  const id = useId();
  const [selected, setSelected] = useState(0);
  const [examples, setExamples] = useState<Record<string, boolean>>({});
  const step = steps[selected];
  const button = 'min-h-11 rounded-lg border border-primary-text px-4 py-3 font-medium text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-text disabled:cursor-not-allowed disabled:opacity-50';
  return <section aria-labelledby={`${id}-title`} className="rounded-xl border border-ink/15 p-4 sm:p-6">
    <h2 id={`${id}-title`} className="text-xl font-semibold">{text(local('Paglilibot sa platform kasama sina Alex at Rosa', 'Platform walkthrough with Alex and Rosa'))}</h2>
    <p className="mt-3">{text(local('Kathang-isip sina Alex (assessor/facilitator) at Rosa (BHW). Maaari mong sundan, balikan, o ulitin ang mga hakbang. Ang mga demo ay nasa pahinang ito lamang at walang binabago sa totoong tala.', 'Alex (assessor/facilitator) and Rosa (BHW) are fictional. Follow, revisit, or replay the steps. Demo actions stay on this page and change no real records.'))}</p>
    <p className="mt-2 text-sm">{text(local('Ipinapakita ang mga kasalukuyang lugar sa platform at ang binagong daloy kapag available na ito. Pagtuturo lamang ito sa paggamit; hindi ang competency simulation, pagsusulit, o sertipikasyon. Ang pagpunta sa susunod na hakbang ay hindi pag-apruba ng ebidensiya.', 'This shows current platform areas and the revised flow when available. It is a navigation tour, not the competency simulation, an exam, or certification. Moving to the next step does not approve evidence.'))}</p>
    <nav className="mt-5" aria-label={text(local('Mga hakbang sa paglilibot', 'Walkthrough steps'))}>
      <ol className="grid grid-cols-2 gap-2 lg:grid-cols-4">{steps.map((item, index) => <li key={item.id}>
        <button type="button" aria-current={selected === index ? 'step' : undefined} onClick={() => setSelected(index)}
          className={`${button} h-full w-full text-left ${selected === index ? 'bg-primary/10' : ''}`}>
          <span className="mr-2" aria-hidden="true">{index + 1}.</span>{text(item.title)}
        </button>
      </li>)}</ol>
    </nav>
    <div className="mt-5 rounded-xl bg-primary/5 p-4 sm:p-5">
      <div aria-live="polite" aria-atomic="true">
        <p className="text-sm font-medium">{text(local(`Hakbang ${selected + 1} sa ${steps.length} · Demo lamang`, `Step ${selected + 1} of ${steps.length} · Demo only`))}</p>
        <h3 className="mt-1 text-lg font-semibold">{text(step.title)}</h3>
      </div>
      <dl className="mt-4 space-y-4">
        <div><dt className="font-semibold">{text(local('Saan sa platform', 'Where on the platform'))}</dt><dd className="mt-1">{text(step.where)}</dd></div>
        <div><dt className="font-semibold">{text(local('Gagawin ni Alex', 'What Alex does'))}</dt><dd className="mt-1">{text(step.assessor)}</dd></div>
        <div><dt className="font-semibold">{text(local('Gagawin ni Rosa', 'What Rosa does'))}</dt><dd className="mt-1">{text(step.bhw)}</dd></div>
      </dl>
      <button type="button" onClick={() => setExamples(previous => ({...previous, [step.id]: true}))}
        aria-expanded={!!examples[step.id]} aria-controls={`${id}-example`} className={`${button} mt-5 bg-canvas`}>{text(step.action)}</button>
      <div id={`${id}-example`} role="status" aria-atomic="true">
        {examples[step.id] && <p className="mt-4 rounded-lg border border-primary/25 bg-canvas p-4">{text(step.example)}</p>}
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" onClick={() => setSelected(previous => previous - 1)} disabled={selected === 0} className={button}>{text(local('Nakaraang hakbang', 'Previous step'))}</button>
      <button type="button" onClick={() => setSelected(previous => previous + 1)} disabled={selected === steps.length - 1} className={button}>{text(local('Susunod na hakbang', 'Next step'))}</button>
      <button type="button" onClick={() => {setSelected(0); setExamples({});}} className={button}>{text(local('Ulitin ang paglilibot', 'Replay walkthrough'))}</button>
    </div>
    <p className="mt-3 text-sm">{text(local('Maaaring balikan ang mga halimbawa habang bukas ang pahina. Ang replay o pag-reload ay magre-reset ng demo; walang naitatala bilang pagkilala sa briefing o ebidensiya ng kakayahan.', 'Examples remain available while this page is open. Replay or reload resets the demo; nothing is recorded as briefing acknowledgement or competency evidence.'))}</p>
  </section>;
}
