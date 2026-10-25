import Link from 'next/link';

/** Explains reference access; permission remains a server-side action check. */
export function AssessorGuideAccessNotice({programId,chapterKey,locale}:{
  programId:string;chapterKey:string;locale:'en'|'fil';
}) {
  const en=locale==='en';
  const studyAvailable=chapterKey==='chapter-1'||chapterKey==='chapter-2';
  return <section className="mt-4 space-y-3 border-t border-ink/15 pt-4" aria-labelledby="assessor-guide-access-title">
    <h3 id="assessor-guide-access-title" className="font-semibold">{en?'Guide access and assessment eligibility':'Pagbukas ng gabay at pahintulot sa pagtatasa'}</h3>
    <p className="text-sm">{en
      ?'You can read this facilitator guide while preparing. Reading it does not save your personal study progress or qualify you to assess BHWs.'
      :'Maaari mong basahin ang gabay ng facilitator habang naghahanda. Hindi nito sine-save ang sarili mong progreso sa pag-aaral o ibinibigay ang kwalipikasyon para magtasa ng mga BHW.'}</p>
    <p className="text-sm">{en
      ?'Complete your own chapter preparation and check My certifications for requirements. Starting a formal assessment separately checks current assessor authority and BHW readiness.'
      :'Tapusin ang sarili mong paghahanda sa kabanata at tingnan ang Aking mga sertipikasyon para sa mga kailangan. Hiwalay na sinusuri ang kasalukuyang awtoridad ng assessor at kahandaan ng BHW bago simulan ang pormal na pagtatasa.'}</p>
    <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label={en?'My assessor preparation and requirements':'Aking paghahanda at mga kailangan bilang assessor'}>
      {studyAvailable && <Link prefetch={false} className="min-h-11 content-center underline" href={`/training/${programId}/assessor/${chapterKey}`}>
        {en?'Open my chapter preparation':'Buksan ang sarili kong paghahanda sa kabanata'}</Link>}
      <Link prefetch={false} className="min-h-11 content-center underline" href={`/training/${programId}/assessor/qualifications#${chapterKey}`}>
        {en?'Check my certification requirements':'Tingnan ang mga kailangan sa aking sertipikasyon'}</Link>
    </nav>
  </section>;
}
