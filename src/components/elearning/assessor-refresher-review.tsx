import Link from 'next/link';

export const ASSESSOR_REFRESHER_ID='assessor-refresher-review';

export function AssessorRefresherLink({chapterHref,locale}:{chapterHref:string;locale:string}) {
  return <Link prefetch={false} className="inline-flex min-h-11 self-start items-center rounded-md border border-ink/25 px-4 py-3 underline"
    href={`${chapterHref}#${ASSESSOR_REFRESHER_ID}`}>
    {locale==='en'?'Refresher review and study pace':'Balik-aral at bilis ng pag-aaral'}
  </Link>;
}

/** Navigation over current, personally completed lessons; never new evidence. */
export function AssessorRefresherReview({locale,lessons}:{
  locale:string;lessons:Array<{href:string;title:string}>;
}) {
  const en=locale==='en';
  return <section id={ASSESSOR_REFRESHER_ID} tabIndex={-1} aria-labelledby="assessor-refresher-title"
    className="scroll-mt-40 space-y-3 rounded-xl border border-ink/20 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary md:scroll-mt-28 sm:p-5">
    <h2 id="assessor-refresher-title" className="text-lg font-semibold">{en?'Optional refresher review':'Opsyonal na balik-aral'}</h2>
    <p className="text-sm">{en
      ?'Revisit completed lessons from this chapter to refresh your knowledge. Your recorded completion stays intact; reviewing does not renew certification.'
      :'Balikan ang mga natapos na aralin sa kabanatang ito upang sariwain ang kaalaman. Mananatili ang naitalang pagtatapos; hindi nito nire-renew ang sertipikasyon.'}</p>
    <p className="text-sm">{en
      ?'Personal study is self-paced, with no daily lesson cap or lesson countdown. Choose a manageable set of lessons per sitting and return later from Study progress and lesson list. Formal assessment follows its agreed schedule and requirements.'
      :'Nasa iyo ang bilis ng sariling pag-aaral: walang arawang limitasyon sa dami ng aralin o countdown sa aralin. Pumili ng kayang aralin sa bawat pag-upo at bumalik sa Progreso sa pag-aaral at listahan ng mga aralin. Susundin pa rin ang napagkasunduang iskedyul at mga kailangan sa pormal na pagtatasa.'}</p>
    {lessons.length>0?<details className="rounded-md border border-ink/15 px-3">
      <summary className="min-h-11 cursor-pointer content-center py-2 font-medium">{en?`Review completed lessons (${lessons.length})`:`Balikan ang natapos na mga aralin (${lessons.length})`}</summary>
      <ol className="space-y-2 border-t border-ink/15 py-3">{lessons.map(lesson=><li key={lesson.href}>
        <Link prefetch={false} className="inline-flex min-h-11 items-center wrap-anywhere py-2 underline" href={lesson.href}>{lesson.title}</Link>
      </li>)}</ol>
    </details>:<p className="text-sm text-ink/75">{en
      ?'Completed lessons will appear here for review. Continue your preparation using the chapter lesson list.'
      :'Makikita rito ang mga natapos na aralin para sa balik-aral. Ipagpatuloy ang paghahanda gamit ang listahan ng mga aralin sa kabanata.'}</p>}
  </section>;
}
