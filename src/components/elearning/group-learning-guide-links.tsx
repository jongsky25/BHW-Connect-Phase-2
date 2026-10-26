import Link from 'next/link';

/** Route-only guidance for actual assessor study; no private notes are loaded. */
export function GroupLearningGuideLinks({lessonHref,moduleHref,locale}:{
  lessonHref:string;moduleHref:string;locale:string;
}) {
  const en=locale==='en';
  return <aside aria-labelledby="group-learning-guide-title" className="space-y-3 rounded-xl border border-secondary/30 bg-secondary/5 p-4">
    <h2 id="group-learning-guide-title" className="font-semibold">{en?'Facilitate group learning':'Gumabay sa pag-aaral ng pangkat'}</h2>
    <p className="text-sm">{en
      ?'Open this lesson’s facilitator guide for discussion, examples, practice and follow-up. Your own study progress is separate from facilitating a group.'
      :'Buksan ang gabay ng facilitator sa araling ito para sa talakayan, mga halimbawa, pagsasanay at follow-up. Hiwalay ang sarili mong progreso sa paggabay sa pangkat.'}</p>
    <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label={en?'Group learning guides':'Mga gabay sa pag-aaral ng pangkat'}>
      <Link prefetch={false} className="inline-flex min-h-11 items-center py-2 underline" href={lessonHref}>{en?'Facilitator guide for this lesson':'Gabay ng facilitator sa araling ito'}</Link>
      <Link prefetch={false} className="inline-flex min-h-11 items-center py-2 underline" href={`${moduleHref}?view=run`}>{en?'How to run this subchapter':'Paano patakbuhin ang subchapter'}</Link>
    </nav>
  </aside>;
}
