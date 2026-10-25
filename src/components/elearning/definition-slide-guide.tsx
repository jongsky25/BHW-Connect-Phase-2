import type {definitionSlideGuide} from '@/lib/elearning/definition-slide-presentation';

export function DefinitionSlideGuide({guide}: {guide: NonNullable<ReturnType<typeof definitionSlideGuide>>}) {
  return <aside data-definition-slide-guide aria-label={guide.en?'Slide position and viewing help':'Puwesto sa Slides at gabay sa pagtingin'} className="my-3 min-w-0 rounded-lg border border-ink/20 bg-canvas p-3 text-ink">
    <p className="font-semibold">Slide {guide.index+1} {guide.en?'of':'sa'} {guide.count}</p>
    {guide.index===0&&<p className="mt-1 text-sm leading-relaxed">{guide.en
      ? 'Use Previous and Next for the illustrated summaries, or Full screen for presentation view. Read has the full explanation.'
      : 'Gamitin ang Nakaraan at Susunod para sa mga buod na may ilustrasyon, o Buong screen para sa presentasyon. Nasa Basahin ang buong paliwanag.'}</p>}
    {guide.index===guide.count-1&&<p className="mt-1 text-sm leading-relaxed">{guide.en?'Choose a response to reveal the summary and feedback.':'Pumili ng sagot upang makita ang buod at feedback.'}</p>}
  </aside>;
}
