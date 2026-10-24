import type {FollowUpVisual} from '@/lib/elearning/follow-up-learning-visuals';

/** Approved lesson excerpts, organized as native-text learning diagrams. */
export function FollowUpLearningVisual({visual}: {visual: FollowUpVisual}) {
  return <figure aria-label={visual.title} data-follow-up-visual={visual.kind} className="my-4 min-w-0 rounded-xl border border-ink/20 bg-canvas p-3 text-ink sm:p-4">
    <figcaption className="mb-3 font-semibold">{visual.title}</figcaption>
    <ul className={visual.kind === 'questions' ? 'grid gap-3 lg:grid-cols-3' : 'grid gap-3 sm:grid-cols-2'}>
      {visual.cards.map((card, index) => <li key={card.label} className="min-w-0 rounded-lg border border-ink/20 border-t-4 border-t-primary p-3">
        <span aria-hidden="true" className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/30 font-semibold text-primary-text">{visual.kind === 'questions' ? 'ABC'[index] : visual.kind === 'response' ? (index === 0 ? '?' : '…') : index + 1}</span>
        <h3 className="break-words font-semibold">{card.label}</h3>
        {card.detail && <p className="mt-2 break-words text-sm leading-relaxed">{card.detail}</p>}
        {visual.kind === 'plan' && <span aria-hidden="true" className="mt-4 block border-b border-dashed border-ink/30"/>}
      </li>)}
    </ul>
    <p className="mt-3 border-t border-ink/15 pt-3 text-sm leading-relaxed">{visual.caption}</p>
  </figure>;
}
