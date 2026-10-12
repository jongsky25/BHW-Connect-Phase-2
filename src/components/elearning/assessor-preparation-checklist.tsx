import Link from 'next/link';
import {preparationChecklist,type PreparationChecklistInput,type PreparationStep,type ChecklistStatus} from '@/lib/assessor/preparation-checklist';

export function AssessorPreparationChecklist({input,baseHref,locale}:{input:PreparationChecklistInput;baseHref:string;locale:string}) {
  const en=locale==='en';
  const text=(fil:string,english:string)=>en?english:fil;
  const model=preparationChecklist(input);
  const labels:Record<PreparationStep,[string,string]>={
    briefing:['Panimulang briefing','Opening briefing'],pretest:['Diagnostic pretest','Diagnostic pretest'],
    study:[`Sariling pag-aaral · ${input.completed} sa ${input.total} aralin`,`Personal study · ${input.completed} of ${input.total} lessons`],
    posttest:[`Pangwakas na pagsusulit · ${input.passingPercent}% upang pumasa`,`Chapter post-test · ${input.passingPercent}% to pass`],
    orientation:['Oryentasyon at pagsasanay sa pagmamarka','Scoring orientation and exercise'],
    simulation:['Pagsasanay sa paggamit ng platform','Platform competency simulation'],
    certification:['Sertipikasyon sa binagong proseso ng Kabanata 1','Revised Chapter 1 certification'],
  };
  const statuses:Record<ChecklistStatus,[string,string]>={recorded:['Naitala','Recorded'],remaining:['Kailangan pang tapusin','Remaining'],
    unavailable:['Hindi pa available','Not yet available'],unknown:['Hindi mabasa ang katayuan','Status could not be read']};
  const actions:Record<typeof model.next,[string,string,string|null]>={
    briefing:['Balikan ang briefing','Review the briefing',`${baseHref}/briefing`],
    pretest:['Kunin ang diagnostic pretest','Take the diagnostic pretest',`${baseHref}/exam/pretest`],
    study:['Magpatuloy sa pag-aaral','Continue studying',input.nextLessonHref],
    publication:['Hintayin ang mga kulang na aralin; maaari mong balikan ang available na aralin sa ibaba.','Await missing lessons; you can review available lessons below.',null],
    posttest:['Kunin o ulitin ang pangwakas na pagsusulit','Take or retry the chapter post-test',`${baseHref}/exam/posttest`],
    orientation:['Ipagpatuloy ang oryentasyon sa pagmamarka','Continue scoring orientation',`${baseHref}/orientation`],
    scoring:['Sagutan ang pagsasanay sa pagmamarka','Complete the scoring exercise',`${baseHref}/orientation`],
    simulation:['Ipagpatuloy ang simulation','Continue platform simulation',`${baseHref}/simulation`],
    certification_pending:['Naitala ang simulation. Hintayin ang revised certification.','Simulation recorded. Await revised certification.',null],
    simulation_pending:['Hintayin ang pagsasanay sa platform. Maaari mong balikan ang mga aralin at briefing.','Await the platform simulation. You can review lessons and the briefing.',null],
    qualification:['Tingnan ang kasalukuyang kwalipikasyon at katayuan','Review your existing qualification and status',`${baseHref.split('/assessor/')[0]}/assessor/qualifications`],
    status_retry:['Basahin muli ang katayuan ng paghahanda','Reload preparation status',baseHref],
    requirements:['Hintayin ang aprubadong pagsusulit o oryentasyon.','Await the approved exam or orientation.',null],
  };
  const action=actions[model.next];
  return <section className="rounded-xl border border-ink/15 p-4 sm:p-5" aria-label={text('Aking paghahanda sa Kabanata 1','My Chapter 1 preparation')}>
    <h2 className="text-lg font-semibold">{text('Aking paghahanda sa Kabanata 1','My Chapter 1 preparation')}</h2>
    <p className="mt-2 text-sm">{text('Ito ay sarili mong paghahanda bilang assessor. Hiwalay ito sa progreso at pagtatasa ng BHW. Hindi nagbibigay ng sertipikasyon ang checklist.','This is your own assessor preparation, separate from BHW progress and assessment. The checklist does not issue certification.')}</p>
    <ol className="mt-4 space-y-3">{model.steps.map((step,index)=><li key={step.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink/10 pb-2">
      <span><span aria-hidden="true">{index+1}. </span><span>{text(...labels[step.id])}</span></span><span className="text-sm font-medium">{text(...statuses[step.status])}</span>
    </li>)}</ol>
    <p className="mt-3 text-sm">{text('Ang diagnostic ay hindi pass/fail. Ang oryentasyon sa pagmamarka ay hiwalay sa susunod na simulation.','The diagnostic is not pass/fail. Scoring orientation is separate from the later platform simulation.')}</p>
    {input.missing>0&&<p className="mt-3 text-sm">{text(`${input.missing} sa ${input.total} kinakailangang aralin ang hindi pa available. Mananatili ang buong bilang ng mga aralin.`,`${input.missing} of ${input.total} required lessons are not yet available. The full lesson count stays the same.`)}</p>}
    {!input.qualification&&<p className="mt-3 text-sm" role="status">{text('Hindi makumpirma ang katayuan ng oryentasyon at kwalipikasyon. Nananatili ang iyong naitalang pag-aaral.','Orientation and qualification status could not be confirmed. Your recorded study progress is retained.')}</p>}
    {model.qualificationStatus&&['active','suspended','revoked'].includes(model.qualificationStatus)&&<p className="mt-3 text-sm">{text('May umiiral na rekord ng kwalipikasyon. Tingnan ang katayuan nito; hindi ito awtomatikong ginagawang sertipikasyon sa binagong proseso.','An existing qualification record is on file. Review its status; it is not automatically converted into certification under the revised process.')}</p>}
    {input.simulation&&<Link prefetch={false} href={`${baseHref}/simulation`} className="mt-3 block underline">{text('Buksan o ulitin ang simulation; mananatili ang naunang completion.','Open or replay the simulation; earlier completion is retained.')}</Link>}
    <div className="mt-4 rounded-lg border border-primary/30 p-4">
      <h3 className="font-semibold">{text('Inirerekomendang susunod na hakbang','Recommended next step')}</h3>
      {action[2]?<Link prefetch={false} href={action[2]} className="mt-2 inline-flex min-h-11 items-center py-2 font-medium text-primary-text underline">{text(action[0],action[1])}</Link>:<p className="mt-2">{text(action[0],action[1])}</p>}
      <p className="mt-2 text-sm">{text('Hindi pa available ang bagong pagbibigay ng sertipikasyon. Ang pagkumpleto ng pag-aaral ay hindi pahintulot na magsagawa ng pormal na pagtatasa.','Revised certification issuance is not yet available. Completing study does not authorize formal assessment.')}</p>
    </div>
  </section>;
}
