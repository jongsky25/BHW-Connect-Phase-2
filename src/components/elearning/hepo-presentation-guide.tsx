import {hepoSectionGoal} from '@/lib/elearning/hepo-presentation';

export function HepoPresentationGuide({position, index, count, slides, en}: {position: string; index: number; count: number; slides: boolean; en: boolean}) {
  const goal = hepoSectionGoal(position, en);
  if (!goal) return null;
  return <aside data-hepo-presentation-guide aria-label={en ? 'Viewing this section' : 'Pagtingin sa bahaging ito'} className="mb-4 min-w-0 rounded-lg border border-primary/35 bg-primary/5 p-3 text-ink">
    <p className="font-semibold" data-hepo-position>{slides ? 'Slide' : en ? 'Section' : 'Bahagi'} {index + 1} {en ? 'of' : 'sa'} {count}</p>
    <p className="mt-1 text-sm leading-relaxed"><span className="font-semibold">{en ? 'Learning focus: ' : 'Pokus ng pag-aaral: '}</span>{goal}</p>
    {!slides && !en && position === 'morning' && <p className="mt-2 text-sm leading-relaxed">Alas-otso, alas-diyes at alas-onse ay pawang oras sa umaga (8:00 a.m., 10:00 a.m. at 11:00 a.m.). Kaya mas malawak ang papel na ginagampanan ng mga BHW kaysa sa pagtulong lamang sa serbisyo.</p>}
    {slides && index === 0 && <p className="mt-2 text-sm leading-relaxed">{en
      ? 'One summary slide is shown at a time. Use Previous and Next below, or Full screen for presentation view. Read has the full explanation; Narrated story is a separate, optional video.'
      : 'Isang slide ng buod ang ipinapakita sa bawat pagkakataon. Gamitin ang Nakaraan at Susunod sa ibaba, o Buong screen para sa presentasyon. Nasa Basahin ang buong paliwanag; hiwalay at opsyonal na video ang Kuwentong may salaysay.'}</p>}
  </aside>;
}
