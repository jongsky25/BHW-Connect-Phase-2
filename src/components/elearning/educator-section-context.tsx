import type {EducatorContext} from '@/lib/elearning/educator-section-context';

export function EducatorSectionContext({context}: {context: EducatorContext}) {
  return <figure aria-label={context.title} data-educator-context={context.section} className="my-4 min-w-0 rounded-xl border border-ink/20 bg-canvas p-3 text-ink sm:p-4">
    <figcaption className="font-semibold">{context.title}</figcaption>
    <p className="mt-2 text-sm leading-relaxed">{context.bridge}</p>
    <ol className="mt-3 grid gap-2 sm:grid-cols-2">
      {context.steps.map((step,index)=><li key={step} aria-current={index===context.index?'step':undefined} className={`min-w-0 rounded-lg border p-2 text-sm ${index===context.index?'border-primary font-semibold':'border-ink/20'}`}>
        <span aria-hidden="true">{index+1}. </span>{step}
        {index===context.index&&<span className="mt-1 block text-xs">{context.en?'Current step':'Kasalukuyang hakbang'}</span>}
      </li>)}
    </ol>
    {context.slides&&<div className="mt-3 border-t border-ink/15 pt-3 text-sm leading-relaxed"><p className="font-semibold">{context.en?'From Read':'Mula sa Basahin'}</p><blockquote>{context.excerpt}</blockquote></div>}
  </figure>;
}
