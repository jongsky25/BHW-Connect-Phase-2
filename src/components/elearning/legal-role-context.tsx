import type {LegalRoleContext as Context} from '@/lib/elearning/legal-role-context';

export function LegalRoleContext({context}: {context: Context}) {
  return <figure aria-label={context.title} data-legal-role-context={context.section} className="my-4 min-w-0 rounded-xl border border-ink/20 bg-canvas p-3 text-ink sm:p-4">
    <figcaption className="mb-3 font-semibold">{context.title}</figcaption>
    <ul className={context.cards.length===1?'space-y-3':'grid gap-3 sm:grid-cols-2'}>
      {context.cards.map(card=><li key={card.label} className="min-w-0 rounded-lg border border-ink/20 border-t-4 border-t-primary p-3">
        <h3 className="break-words font-semibold">{card.label}</h3>
        <p className="mt-2 break-words text-sm leading-relaxed">{card.text}</p>
      </li>)}
    </ul>
    <p className="mt-3 text-sm leading-relaxed">{context.caption}</p>
    <p className="mt-3 border-t border-ink/15 pt-3 text-sm"><span className="font-semibold">{context.en?'Legal source: ':'Batayang batas: '}</span><a className="underline underline-offset-2" href={context.sourceUrl} target="_blank" rel="noreferrer">{context.en?'Read RA 7883, sections 3–4':'Basahin ang RA 7883, seksiyon 3–4'}</a></p>
  </figure>;
}
