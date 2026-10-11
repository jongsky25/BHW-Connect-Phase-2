import manifest from '../../../content/assessor/bhw-reference-manual.v1.json';
import {AssessorNavigationTour} from './assessor-navigation-tour';
import {AssessorBriefingAcknowledgement} from './assessor-briefing-acknowledgement';
import type {BriefingState} from '@/lib/assessor/briefing';

export function AssessorBriefing({locale, chapterHref, programId, actorId, initial, preview = false}: {
  locale: string; chapterHref: string; programId: string; actorId: string; initial: BriefingState | null; preview?: boolean;
}) {
  const language = locale === 'en' ? 'en' : 'fil';
  const text = (fil: string, en: string) => language === 'en' ? en : fil;
  const chapter = manifest.chapters.find(item => item.chapter_key === 'chapter-1')!;
  const lessonCount = chapter.modules.reduce((total, item) => total + item.required_lesson_keys.length, 0);
  const objectives = [
    text('Ipaliwanag ang tungkulin at hangganan ng BHW, mga kaugnay na batas, at mga polisiya ng Barangay Health Station.', 'Explain the BHW’s roles and limits, relevant laws, and Barangay Health Station policies.'),
    text('Tulungan ang BHW na makipagtulungan sa barangay, makipag-usap nang malinaw at may paggalang, at magplano ng tugon sa mga problema.', 'Help a BHW work with the barangay, communicate clearly and respectfully, and plan responses to problems.'),
    text('Gabayan ang BHW sa ligtas, mahusay, at responsableng mga gawi sa trabaho.', 'Guide a BHW in safe, efficient, and responsible working practices.'),
    text('Ihiwalay ang pagtuturo at pagsasanay sa pormal na pagtatasa; gumamit ng pamantayan at aktuwal na ebidensiya sa paghatol.', 'Distinguish teaching and practice from formal assessment; base judgments on criteria and observed evidence.'),
  ];
  const facilitator = [
    text('Paghandaan ang aralin: suriin ang layunin, gabay, gawain, at mga kailangang materyales.', 'Prepare the lesson: review its objectives, guide, activity, and required materials.'),
    text('Ipaliwanag ang gawain at iugnay ito sa tunay na sitwasyon ng barangay. Anyayahan ang BHW na magtanong at magsanay.', 'Explain the task and connect it to barangay situations. Invite the BHW to ask questions and practise.'),
    text('Magbigay ng angkop na gabay at malinaw na feedback. Itala kung anong tulong ang ibinigay at ano ang kailangan pang sanayin.', 'Offer appropriate guidance and clear feedback. Record the help given and what needs further practice.'),
  ];
  const assessor = [
    text('Bago magsimula, sabihin kung pormal na pagtatasa ang gawain at ipaliwanag ang pamantayan at pinapayagang tulong.', 'Before starting, say when a task is a formal assessment and explain the criteria and permitted help.'),
    text('Itala ang aktuwal na ginawa o sinabi ng BHW, ang konteksto, at anumang tulong. Huwag magpalagay batay lamang sa pagdalo o pagtatapos ng aralin.', 'Record what the BHW actually did or said, the context, and any help provided. Do not infer competence from attendance or lesson completion alone.'),
    text('Kung kulang o naputol ang obserbasyon, humingi ng karagdagang ebidensiya. Hindi ito awtomatikong bagsak. Ipaliwanag ang resulta at susunod na pagsasanay o muling pagtatasa.', 'If an observation is missing or interrupted, seek more evidence. This is not automatically a failure. Explain the result and the next practice or reassessment step.'),
  ];
  const preparation = [
    {id: 'briefing', title: text('Panimulang briefing', 'Opening briefing'), body: text('Unawain ang mga layunin, responsibilidad, at paggamit ng platform. Pagkatapos basahin ang briefing at tingnan ang paglilibot, tahasang itala ang iyong pagkilala sa ibaba; hindi ito pagsusulit.', 'Understand the objectives, responsibilities, and platform navigation. After reading the briefing and reviewing the walkthrough, explicitly save your acknowledgement below; this is not an exam.')},
    {id: 'pretest', title: text('Diagnostic pretest', 'Diagnostic pretest'), body: text('Kunin bago ang mga aralin upang makita ang dati mo nang alam at mga dapat tutukan. Hindi ito pass/fail at hindi nagbibigay ng sertipikasyon.', 'Take this before the lessons to identify what you already know and where to focus. It is not pass/fail and does not award certification.')},
    {id: 'study', title: text('Sariling pag-aaral', 'Personal study'), body: text(`Kumpletuhin ang lahat ng ${lessonCount} kinakailangang aralin sa ${chapter.modules.length} paksa. Maaari mong balikan ang mga aralin; kung may hindi pa nailathalang kinakailangang aralin, hindi pa kumpleto ang pag-aaral.`, `Complete all ${lessonCount} required lessons across ${chapter.modules.length} topics. You can revisit lessons; if a required lesson is not yet published, study is not yet complete.`)},
    {id: 'posttest', title: text('Pangwakas na pagsusulit', 'Chapter post-test'), body: text(`Pagkatapos ng pretest at lahat ng kinakailangang aralin, kumuha ng post-test. Ang kasalukuyang pamantayan ay ${chapter.posttest.passing_percent}%. Kung hindi pumasa, balikan ang dapat tutukan bago muling kumuha.`, `After the pretest and every required lesson, take the post-test. The current passing score is ${chapter.posttest.passing_percent}%. If you do not pass, review the gaps before trying again.`)},
    {id: 'orientation', title: text('Oryentasyon sa pagmamarka', 'Scoring orientation'), body: text('Pagkatapos pumasa sa post-test, pag-aralan ang pamantayan, pag-record ng ebidensiya, at mga sitwasyon sa pagmamarka. Kumpletuhin at ipasa ang calibration exercise, kabilang ang kinakailangang sitwasyon sa kaligtasan.', 'After passing the post-test, study the criteria, evidence recording, and scoring cases. Complete and pass the calibration exercise, including the required safety case.')},
    {id: 'simulation', title: text('Pagsasanay sa paggamit ng platform', 'Platform competency simulation'), body: text('Gamit ang kathang-isip na BHW, magsanay sa paghahanda, pagpapadaloy, obserbasyon, at pagtatasa sa platform. May gabay at muling pagsubok; kumpletuhin ang lahat ng kinakailangang checkpoint. Walang totoong tala ng BHW na babaguhin.', 'Using a fictional BHW, practise preparation, facilitation, observation, and assessment in the platform. Guidance and retries are allowed; complete every required checkpoint. No real BHW records are changed.')},
    {id: 'certification', title: text('Sertipikasyon para sa Kabanata 1', 'Chapter 1 certification'), body: text('Kapag kumpleto at balido ang lahat ng kinakailangang ebidensiya, susuriin ang pagiging karapat-dapat para sa sertipikasyon. Hindi awtomatikong sertipikasyon ang pagtatapos ng aralin o pagpasa sa post-test lamang.', 'When all required evidence is complete and valid, eligibility for certification is checked. Lesson completion or a post-test pass alone does not automatically award certification.')},
  ];
  return <div className="space-y-6">
    {preview && <p role="status" className="rounded-xl border border-primary p-4">{text('Preview lamang ng admin. Walang pag-aaral, pagkilala, o pagtatasa ang maitatala rito.', 'Admin preview only. No study completion, acknowledgement, or assessment is recorded here.')}</p>}
    <header>
      <p className="text-sm font-semibold text-primary">{text('Panimulang briefing para sa assessor/facilitator', 'Assessor/facilitator opening briefing')}</p>
      <h1 className="mt-2 text-2xl font-semibold">{text('Kabanata 1: Ang BHW at ang Kanyang Barangay', 'Chapter 1: BHWs and Their Barangay')}</h1>
      <p className="mt-3">{text('Isa ang iyong account, ngunit dalawa ang iyong responsibilidad: tulungan ang BHW na matuto bilang facilitator, at suriin ang ipinakitang kakayahan bilang assessor.', 'You use one account with two responsibilities: help the BHW learn as a facilitator, and evaluate demonstrated competence as an assessor.')}</p>
    </header>
    <section aria-labelledby="briefing-objectives" className="rounded-xl border border-ink/15 p-4 sm:p-6">
      <h2 id="briefing-objectives" className="text-xl font-semibold">{text('Mga layunin ng iyong paghahanda', 'Objectives of your preparation')}</h2>
      <p className="mt-2">{text('Pagkatapos ng iyong paghahanda para sa Kabanata 1, inaasahang magagawa mo ang sumusunod:', 'After preparing for Chapter 1, you should be able to:')}</p>
      <ul className="mt-3 list-disc space-y-2 pl-5">{objectives.map(item => <li key={item}>{item}</li>)}</ul>
      <details className="mt-5">
        <summary className="min-h-11 cursor-pointer py-3 font-medium underline">{text(`Saklaw: ${chapter.modules.length} paksa at ${lessonCount} kinakailangang aralin`, `Coverage: ${chapter.modules.length} topics and ${lessonCount} required lessons`)}</summary>
        <ol className="list-decimal space-y-2 pl-5">{chapter.modules.map(item => <li key={item.module_key}>{item.title[language]}</li>)}</ol>
      </details>
    </section>
    <section aria-labelledby="briefing-sequence" className="rounded-xl border border-ink/15 p-4 sm:p-6">
      <h2 id="briefing-sequence" className="text-xl font-semibold">{text('Ang iyong paghahanda at sertipikasyon', 'Your preparation and certification')}</h2>
      <p className="mt-3">{text('Ito ang pagkakasunod-sunod ng mga kinakailangan para sa binagong sertipikasyon ng Kabanata 1. Sarili mong paghahanda ito bago ang opisyal na gawain kasama ang BHW.', 'This is the required sequence for revised Chapter 1 certification. It is your own preparation before official work with a BHW.')}</p>
      <ol className="mt-5 list-decimal space-y-5 pl-6">{preparation.map(step => <li key={step.id}>
        <h3 className="font-semibold">{step.title}</h3>
        <p className="mt-1">{step.body}</p>
      </li>)}</ol>
      <p className="mt-5 rounded-lg bg-primary/5 p-4">{text('Hindi pa available ang competency simulation at pagbibigay ng binagong sertipikasyon. Makikita sa iyong personal na pag-aaral ang kasalukuyang mga aralin, pagsusulit, at naitalang progreso. Hindi binabago ng briefing na ito ang anumang dati nang kwalipikasyon.', 'The competency simulation and revised certification issuance are not yet available. Your personal study page shows current lessons, exams, and recorded progress. This briefing does not change any existing qualification.')}</p>
      <p className="mt-3">{text('Maglaan ng oras para sa sariling pag-aaral, pagsasanay sa platform, at hiwalay na sesyon kasama ang BHW. Maaari mong balikan ang pag-aaral; hindi kailangang tapusin ang lahat sa isang upuan.', 'Allow time for personal study, platform practice, and separate sessions with a BHW. You can return to your study; you do not need to finish everything in one sitting.')}</p>
      <h3 className="mt-5 font-semibold">{text('Sertipikasyon bawat kabanata at para sa tatlong kabanata', 'Certification per chapter and across all three chapters')}</h3>
      <p className="mt-2">{text('Hiwalay ang sertipikasyon ng Kabanata 1, 2, at 3. Ang sertipikasyon ng Kabanata 1 ay para lamang sa Kabanata 1. Ang pangkalahatang sertipikasyon ay mangangailangan ng balido at magkakatugmang sertipikasyon sa lahat ng tatlong kabanata; walang dagdag na pangkalahatang pagsusulit. Hindi pa available ang landas ng sertipikasyon para sa Kabanata 3.', 'Chapters 1, 2, and 3 have separate certifications. A Chapter 1 certification covers Chapter 1 only. Overall certification will require valid, compatible certifications for all three chapters, with no additional overall exam. The Chapter 3 certification pathway is not yet available.')}</p>
    </section>
    <div className="grid gap-4 md:grid-cols-2">
      <section aria-labelledby="briefing-facilitator" className="rounded-xl border border-ink/15 p-4 sm:p-6">
        <h2 id="briefing-facilitator" className="text-xl font-semibold">{text('Bilang facilitator: gabayan ang pagkatuto', 'As facilitator: support learning')}</h2>
        <ul className="mt-3 list-disc space-y-3 pl-5">{facilitator.map(item => <li key={item}>{item}</li>)}</ul>
      </section>
      <section aria-labelledby="briefing-assessor" className="rounded-xl border border-ink/15 p-4 sm:p-6">
        <h2 id="briefing-assessor" className="text-xl font-semibold">{text('Bilang assessor: suriin ang ebidensiya', 'As assessor: evaluate evidence')}</h2>
        <ul className="mt-3 list-disc space-y-3 pl-5">{assessor.map(item => <li key={item}>{item}</li>)}</ul>
      </section>
    </div>
    <section aria-labelledby="briefing-boundaries" className="rounded-xl bg-primary/5 p-4 sm:p-6">
      <h2 id="briefing-boundaries" className="text-xl font-semibold">{text('Mga hangganan at inaasahan', 'Boundaries and expectations')}</h2>
      <p className="mt-3">{text('Sabihin sa BHW kung pagsasanay o pormal na pagtatasa ang ginagawa. Ang tagumpay na may coaching ay kapaki-pakinabang na ebidensiya ng pagsasanay, ngunit hindi awtomatikong pormal na pagpasa. Ang isang aralin o marka ay maaaring bahagi lamang ng ebidensiya para sa mas malawak na kakayahan.', 'Tell the BHW whether you are practising or formally assessing. Success with coaching is useful practice evidence, but does not automatically become a formal pass. One lesson or rating may provide only part of the evidence for a broader competency.')}</p>
      <p className="mt-3">{text('Igalang ang dignidad at pagiging kumpidensiyal ng BHW at mga pasyente. Itala lamang ang kinakailangang impormasyon at sundin ang saklaw ng iyong awtorisasyon.', 'Respect the dignity and confidentiality of BHWs and patients. Record only necessary information and work within your authorized scope.')}</p>
      <p className="mt-3 font-medium">{text('Ang pagbasa sa briefing ay hindi sertipikasyon at hindi nagbibigay ng pahintulot para sa opisyal na pagpapadaloy o pagtatasa. Kailangan muna ang wastong awtorisasyon para sa kabanata.', 'Reading this briefing is not certification and does not authorize official facilitation or assessment. Current chapter authorization is required first.')}</p>
    </section>
    <AssessorNavigationTour locale={locale}/>
    {!preview && <AssessorBriefingAcknowledgement key={`${programId}:${actorId}:${initial?.briefingVersion ?? 'unknown'}:${initial?.acknowledgedAt ?? 'pending'}`} locale={locale} programId={programId} actorId={actorId} chapterHref={chapterHref} initial={initial}/>}
  </div>;
}
