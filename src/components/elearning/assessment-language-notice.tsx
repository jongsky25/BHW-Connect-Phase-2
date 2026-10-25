import Link from 'next/link';

/** Availability only: never translates questions or changes an attempt. */
export function AssessmentLanguageNotice({en}:{en:boolean}){
  return <aside data-assessment-language-notice lang={en?'en':'fil'} aria-label={en?'Assessment language availability':'Mga wikang available sa pagtatasa'} className="rounded-lg border border-ink/20 bg-canvas p-3 text-sm leading-relaxed text-ink">
    <p className="font-medium">{en?'Chapter assessment languages: English and Filipino.':'Mga wika ng pagsusulit sa kabanata: English at Filipino.'}</p>
    <p className="mt-2">{en?'Cebuano and Hiligaynon translations of the chapter assessment are not yet available. Translated lessons do not change the language of assessment questions.':'Wala pang salin ng pagtatasa sa Cebuano at Hiligaynon. Hindi binabago ng salin ng aralin ang wika ng mga tanong sa pagtatasa.'}</p>
    <Link prefetch={false} href="/settings" className="mt-2 inline-flex min-h-[44px] items-center underline underline-offset-2">{en?'Choose English / Filipino in Settings before starting':'Piliin ang English / Filipino sa Settings bago magsimula'}</Link>
  </aside>;
}
