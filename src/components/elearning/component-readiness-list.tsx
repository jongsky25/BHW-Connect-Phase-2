import {componentBlockerLabel,type ComponentReadiness} from '@/lib/assessor/component-readiness';

export function ComponentReadinessList({components,lang}:{components:ComponentReadiness[];lang:'fil'|'en'}){
  const label=(fil:string,en:string)=>lang==='en'?en:fil;
  return <div className="mt-4 space-y-3">
    <p className="text-sm text-ink/75">{label(
      'Bawat bahagi ay sinusuri ayon sa sarili nitong aprubadong aralin at pamantayan. Ang pagsasanay ay gabay lamang; hindi ito pormal na pasya.',
      'Each component uses its own approved lessons and criteria. Practice is context only, not a formal decision.')}</p>
    {!components.length&&<p role="status">{label('Walang bahagi ng Kabanata 1 na available.','No Chapter 1 components are available.')}</p>}
    <ul className="grid gap-3 sm:grid-cols-2">
      {components.map(item=><li key={item.moduleId} className="rounded-lg border border-ink/20 p-4">
        <h3 className="font-semibold">{lang==='en'?item.titleEn:item.titleFil}</h3>
        <p className="mt-1 text-sm">{item.canArrange
          ?label('Natutugunan ang kasalukuyang mga kondisyon para mag-ayos ng pagtatasa.',
            'Current conditions allow arranging an assessment.')
          :label('Hindi pa maaaring mag-ayos ng pormal na pagtatasa.',
            'A formal assessment cannot be arranged yet.')}</p>
        {!!item.learnerBlockers.length&&<div className="mt-2 text-sm"><p className="font-medium">{label('Para sa BHW','Learner prerequisites')}</p>
          <ul className="list-disc pl-5">{item.learnerBlockers.map(code=><li key={code}>{componentBlockerLabel(code,lang)}</li>)}</ul></div>}
        {!!item.authorityBlockers.length&&<div className="mt-2 text-sm"><p className="font-medium">{label('Para sa assessor','Assessor authority')}</p>
          <ul className="list-disc pl-5">{item.authorityBlockers.map(code=><li key={code}>{componentBlockerLabel(code,lang)}</li>)}</ul></div>}
      </li>)}
    </ul>
  </div>;
}
