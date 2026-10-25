import {DefinitionSlideGuide} from './definition-slide-guide';
import {LegalRoleContext} from './legal-role-context';
import {EducatorSectionContext} from './educator-section-context';
import {FollowUpLearningVisual} from './follow-up-learning-visual';
import type {RelationshipVisual} from '@/lib/elearning/relationship-learning-visuals';

function CardIcon({index, kind}: {index: number; kind: string}) {
  const paths = kind === 'practice'
    ? ['M8 4h8v16H4V4h4 M9 10a3 3 0 0 1 6 0c0 2-3 2-3 4 M12 17h.01']
    : kind === 'known'
      ? ['M5 12l4 4L19 6', 'M9 8a3 3 0 1 1 5 3c-2 1-2 2-2 3 M12 18h.01']
      : ['M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M2 20v-2a6 6 0 0 1 12 0v2 M16 6a3 3 0 0 1 0 6 M17 15a5 5 0 0 1 5 5',
        'M4 4h16v12H9l-5 4V4 M8 8h8 M8 12h5',
        'M3 9l9-6 9 6 M4 10h16 M6 10v10 M12 10v10 M18 10v10 M3 21h18',
        'M8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M16 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M2 21v-4a6 6 0 0 1 12 0v4 M14 12a6 6 0 0 1 8 5v4'];
  return <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 shrink-0 text-primary-text"><path d={paths[index % paths.length]}/></svg>;
}

/** Native-text diagrams; the four roles are peers in a teaching organizer. */
export function RelationshipLearningVisual({visual}: {visual: RelationshipVisual}) {
  if (visual.kind === 'definition-slide-guide') return <DefinitionSlideGuide guide={visual}/>;
  if (visual.kind === 'legal-role-context') return <LegalRoleContext context={visual}/>;
  if (visual.kind === 'educator-context') return <EducatorSectionContext context={visual}/>;
  if (visual.kind === 'questions' || visual.kind === 'response' || visual.kind === 'plan') return <FollowUpLearningVisual visual={visual}/>;
  return <figure aria-label={visual.title} data-relationship-visual={visual.kind} className="my-4 min-w-0 rounded-xl border border-ink/20 bg-canvas p-3 text-ink sm:p-4">
    <figcaption className="mb-3 space-y-1"><p className="font-semibold">{visual.title}</p><p className="text-sm leading-relaxed">{visual.caption}</p></figcaption>
    <ul className={visual.kind === 'contacts' ? 'space-y-3' : 'grid gap-3 sm:grid-cols-2'}>
      {visual.cards.map((card, index) => <li key={card.label} className={visual.kind === 'contacts'
        ? 'grid min-w-0 gap-2 rounded-lg border border-ink/20 p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center'
        : 'min-w-0 rounded-lg border border-ink/20 border-t-4 border-t-primary p-3'}>
        {visual.kind !== 'contacts' && <CardIcon kind={visual.kind} index={index}/>}
        <h3 className="break-words font-semibold">{card.label}{visual.kind === 'contacts' ? ':' : ''}</h3>
        {visual.kind === 'contacts' && <span aria-hidden="true" className="text-primary-text sm:-rotate-90">↓</span>}
        {card.detail && <p className="mt-1 break-words text-sm leading-relaxed">{card.detail}</p>}
      </li>)}
    </ul>
    {'question' in visual && <p className="mt-3 border-t border-ink/15 pt-3 text-sm font-medium">{visual.question}</p>}
  </figure>;
}
