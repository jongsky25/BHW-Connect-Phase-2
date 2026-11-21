import Link from 'next/link';

/** Read-only exercises; opening this guide never creates evidence or learner records. */
export function AssessorConnectionPractice({programId,locale}:{programId:string;locale:string}) {
 const en=locale==='en';
 const t=(english:string,filipino:string)=>en?english:filipino;
 return <details className="mt-4 min-w-0 space-y-4 break-words rounded-lg border border-ink/20 p-4">
  <summary className="min-h-11 cursor-pointer py-2 font-semibold">{t('Guided practice: navigation, review and connection recovery','Gabay sa pagsasanay: pag-navigate, pagsuri at pagbawi ng koneksyon')}</summary>
  <p>{t('Use the fictional simulation and examples below. Do not edit a real BHW record for practice. Simulation saves affect only your own familiarization progress; these exercises do not grant certification.',
   'Gamitin ang kathang-isip na simulation at mga halimbawa sa ibaba. Huwag baguhin ang tunay na tala ng BHW para magsanay. Sarili mong progreso sa familiarization lamang ang naaapektuhan ng pag-save sa simulation; hindi nagbibigay ng sertipikasyon ang mga pagsasanay na ito.')}</p>
  <ol className="list-decimal space-y-5 pl-5">
   <li><h3 className="font-semibold">{t('Find and revisit a lesson','Hanapin at balikan ang aralin')}</h3>
    <p>{t('Open your preparation, revisit an available lesson and expand Read the Reference Manual. Find its source pages, then return to preparation.',
     'Buksan ang iyong paghahanda, balikan ang isang bukas na aralin at palawakin ang Basahin ang Reference Manual. Hanapin ang mga pahina ng sanggunian, saka bumalik sa paghahanda.')}</p>
    <Link prefetch={false} className="inline-flex min-h-11 items-center underline" href={`/training/${programId}/assessor/chapter-1`}>{t('Open my preparation','Buksan ang aking paghahanda')}</Link>
    <p>{t('Expected: you can revisit the material without resetting completion. Already-loaded text may remain readable offline; new pages and media may not load.',
     'Inaasahan: mababalikan ang materyal nang hindi ni-reset ang pagkumpleto. Maaaring mabasa offline ang nakabukas nang teksto; maaaring hindi mag-load ang bagong pahina at media.')}</p>
   </li>
   <li><h3 className="font-semibold">{t('Save and recover fictional evidence','I-save at balikan ang kathang-isip na ebidensya')}</h3>
    <p>{t('In the simulation, follow the next-step guidance to the observation scene. Write “Fictional practice note”, save it, and wait for confirmation. If the connection fails, keep the page open, reconnect and use Check saved status before retrying. Reopen only after the save is confirmed.',
     'Sa simulation, sundin ang gabay hanggang sa observation scene. Isulat ang “Kathang-isip na tala sa pagsasanay”, i-save ito at hintayin ang kumpirmasyon. Kung maputol ang koneksyon, panatilihing bukas ang pahina, kumonekta muli at gamitin ang Tingnan ang na-save na status bago subukang muli. Buksan muli lamang kapag kumpirmado ang pag-save.')}</p>
    <Link prefetch={false} className="inline-flex min-h-11 items-center underline" href={`/training/${programId}/assessor/chapter-1/simulation`}>{t('Open fictional simulation','Buksan ang kathang-isip na simulation')}</Link>
    <p>{t('Expected: the confirmed note returns when reopened. An unconfirmed note is not safely stored just because the internet reconnects. Closing the app can lose unsaved edits.',
     'Inaasahan: babalik ang kumpirmadong tala kapag binuksan muli. Hindi nangangahulugang ligtas na naimbak ang hindi kumpirmadong tala dahil lamang bumalik ang internet. Maaaring mawala ang hindi pa na-save na pagbabago kapag isinara ang app.')}</p>
   </li>
   <li><h3 className="font-semibold">{t('Review a submitted test','Suriin ang naisumiteng pagsusulit')}</h3>
    <p>{t('In My test results, open an eligible submitted Chapter 1 post-test and choose Needs review. Identify the saved response, correct response and explanation. Expand the later manual reference. If no eligible result exists, use this example: an unfinished test has no submitted score and must not disclose its answers.',
     'Sa Aking mga resulta sa pagsusulit, buksan ang pinapayagang naisumiteng post-test sa Kabanata 1 at piliin ang Dapat balikan. Tukuyin ang naka-save na sagot, tamang sagot at paliwanag. Palawakin ang idinagdag na sanggunian. Kung walang pinapayagang resulta, gamitin ang halimbawa: walang naisumiteng iskor ang hindi pa tapos na pagsusulit at hindi nito dapat ipakita ang mga tamang sagot.')}</p>
    <Link prefetch={false} className="inline-flex min-h-11 items-center underline" href="/my-results">{t('Open my test results','Buksan ang aking mga resulta')}</Link>
    <p>{t('Expected: review leaves the recorded score unchanged. Do not submit or retake a test just to complete this exercise.',
     'Inaasahan: hindi nagbabago ang naitalang iskor sa pagsuri. Huwag magsumite o umulit ng pagsusulit para lamang tapusin ang pagsasanay na ito.')}</p>
   </li>
   <li><h3 className="font-semibold">{t('Interpret a monitoring example','Unawain ang halimbawa sa pagsubaybay')}</h3>
    <p>{t('Fictional page: 3 BHWs; 1 not started, 1 incomplete, 1 submitted. The submitted learner has 12/42 recorded lessons, an earliest retained post-test of 60%, 2 retained submissions, 1 completed practice checkpoint, and Safety: 2/3 needing review. What can you conclude?',
     'Kathang-isip na pahina: 3 BHW; 1 hindi pa nagsimula, 1 hindi pa tapos, 1 nakapagsumite. Ang nakapagsumite ay may 12/42 naitalang aralin, 60% sa pinakaunang natitirang post-test, 2 natitirang naisumiteng pagsusulit, 1 natapos na practice checkpoint, at Kaligtasan: 2/3 dapat balikan. Ano ang mahihinuha mo?')}</p>
    <details><summary className="min-h-11 cursor-pointer py-2 underline">{t('Check the expected interpretation','Tingnan ang inaasahang pag-unawa')}</summary>
     <p>{t('The page counts reconcile to 3, not the whole catchment. Offer follow-up on the 2 of 3 mapped safety questions. The 60% belongs to the earliest retained submission; neither the later score nor learning gain is shown. Practice is separate. This is not a finding of incompetence or readiness for formal assessment.',
      'Tugma sa 3 ang bilang sa pahina, hindi sa buong saklaw. Mag-alok ng tulong sa 2 sa 3 tanong na kaugnay ng kaligtasan. Para sa pinakaunang natitirang pagsusumite ang 60%; hindi ipinapakita ang susunod na iskor o pag-unlad. Hiwalay ang practice. Hindi ito pasya tungkol sa kawalan ng kakayahan o kahandaan sa pormal na pagtatasa.')}</p>
    </details>
    <a className="inline-flex min-h-11 items-center underline" href="#roster">{t('Return to the roster','Bumalik sa roster')}</a>
   </li>
  </ol>
 </details>;
}
