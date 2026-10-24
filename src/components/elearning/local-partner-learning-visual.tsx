import type {LocalPartnerVisual} from '@/lib/elearning/local-partner-visuals';

export function LocalPartnerLearningVisual({visual}: {visual: LocalPartnerVisual}) {
  const List = visual.kind === 'steps' ? 'ol' : 'ul';
  return <figure aria-label={visual.title} data-local-partner-visual={visual.section} className="my-4 min-w-0 rounded-xl border border-ink/20 bg-canvas p-3 text-ink sm:p-4">
    <figcaption className="mb-3 font-semibold">{visual.title}</figcaption>
    <List className="grid gap-3 sm:grid-cols-2">
      {visual.cards.map((card, index) => <li key={card} className="min-w-0 rounded-lg border border-ink/20 border-t-4 border-t-primary p-3">
        {visual.kind === 'steps' && <span aria-hidden="true" className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink/30 font-semibold text-primary-text">{index + 1}</span>}
        <p className="break-words leading-relaxed">{visual.kind === 'steps' ? card.replace(/^\d+\. /, '') : card}</p>
      </li>)}
    </List>
    <p className="mt-3 border-t border-ink/15 pt-3 text-sm leading-relaxed">{visual.caption}</p>
  </figure>;
}
