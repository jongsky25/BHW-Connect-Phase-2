import type {StoryText} from './simulation-storyboard';

const term=(en:string,fil:string):StoryText=>({en,fil});

// These labels are shared by the real flow and its fictional rehearsal. A
// checkpoint describes a real surface; it never carries a real learner ID.
export const chapter1Terms={
  workspace:term('Chapter 1 working area','Working area ng Kabanata 1'),
  roster:term('BHWs I support','Mga BHW na sinusuportahan ko'),
  prepare:term('Prepare','Ihanda'),
  run:term('Run','Patakbuhin'),
  bhwView:term('Show BHW presentation','Ipakita sa BHW'),
  observe:term('Observe a BHW','Obserbahan ang BHW'),
  facts:term('Exact actions and words observed','Eksaktong nasaksihang kilos at salita'),
  sufficiency:term('Sufficient direct evidence','May sapat na direktang ebidensiya'),
  prompted:term('Prompted','May prompt'),
  privateNotes:term('Private assessor notes','Pribadong tala ng assessor'),
  learnerFeedback:term('Feedback for the BHW','Feedback para sa BHW'),
  nextStep:term('Next step','Susunod na hakbang'),
  request:term('Request assessment','Humiling ng pagtatasa'),
  claim:term('Claim request','Akuin ang kahilingan'),
  arrange:term('Save arrangement','Itala ang kasunduan'),
  start:term('Start formal assessment','Simulan ang pormal na pagtatasa'),
  draft:term('Save draft','I-save ang draft'),
  submit:term('Submit formal assessment','Isumite ang pormal na pagtatasa'),
  review:term('Final Chapter 1 review','Pinal na pagsusuri ng Kabanata 1'),
  release:term('Release Chapter 1 review','Ilabas ang pagsusuri ng Kabanata 1'),
} as const;

export const checkpointParity={
  'find-maria':{surface:chapter1Terms.workspace,actions:[chapter1Terms.roster],
    state:term('Select a BHW in your catchment, then the published lesson. The real roster checks current scope.','Pumili ng BHW sa iyong saklaw, saka ng inilathalang aralin. Sinusuri ng tunay na roster ang kasalukuyang saklaw.')},
  prepare:{surface:chapter1Terms.prepare,actions:[chapter1Terms.prepare,chapter1Terms.bhwView,chapter1Terms.prepare],
    state:term('The real lesson opens Prepare, switches to the BHW presentation, then returns to Prepare. The resident card remains private.','Binubuksan ng tunay na aralin ang Ihanda, lumilipat sa presentasyon ng BHW, saka bumabalik sa Ihanda. Pribado ang resident card.')},
  brief:{surface:chapter1Terms.run,actions:[chapter1Terms.run],
    state:term('The Run guide is supported practice. Participation does not issue a formal result.','May suporta ang pagsasanay sa gabay na Patakbuhin. Hindi nagbibigay ng pormal na resulta ang paglahok.')},
  observe:{surface:chapter1Terms.observe,actions:[chapter1Terms.facts,chapter1Terms.sufficiency,chapter1Terms.prompted,chapter1Terms.privateNotes],
    state:term('In the real form, record exact facts and the prompt, choose evidence sufficiency, then rate against the reviewed criterion. The fictional checkboxes only confirm that you inspected supplied facts.','Sa tunay na form, itala ang eksaktong pangyayari at prompt, piliin ang sapat na ebidensiya, saka magbigay ng rating ayon sa inaprubahang pamantayan. Pagkilala lamang sa ibinigay na pangyayari ang mga kathang-isip na checkbox.')},
  feedback:{surface:chapter1Terms.observe,actions:[chapter1Terms.privateNotes,chapter1Terms.learnerFeedback,chapter1Terms.nextStep],
    state:term('Real feedback is separate from private notes and reaches the BHW only when explicitly released. This rehearsal sends nothing.','Hiwalay ang tunay na feedback sa pribadong tala at makikita lamang ng BHW kapag tahasang inilabas. Walang ipinapadala ang pagsasanay na ito.')},
  missing:{surface:chapter1Terms.observe,actions:[chapter1Terms.facts,chapter1Terms.nextStep],
    state:term('Insufficient evidence stays unrated. Record the interruption and another observation as the next step.','Walang rating ang kulang na ebidensiya. Itala ang pagkaantala at panibagong obserbasyon bilang susunod na hakbang.')},
  readiness:{surface:chapter1Terms.workspace,actions:[chapter1Terms.roster,chapter1Terms.request],
    state:term('Current learner prerequisites and assessor authority are checked separately before a request can open. A certificate alone is insufficient.','Hiwalay na sinusuri ang kasalukuyang paunang kailangan ng BHW at awtoridad ng assessor bago mabuksan ang kahilingan. Hindi sapat ang sertipiko lamang.')},
  arrange:{surface:chapter1Terms.workspace,actions:[chapter1Terms.request,chapter1Terms.claim,chapter1Terms.arrange,chapter1Terms.start],
    state:term('The request is claimed and arranged before Start formal assessment becomes available. Each write rechecks current authority.','Inaako at inaayos muna ang kahilingan bago maging available ang Simulan ang pormal na pagtatasa. Muling sinusuri ang kasalukuyang awtoridad sa bawat pagsulat.')},
  formal:{surface:chapter1Terms.start,actions:[chapter1Terms.start,chapter1Terms.draft,chapter1Terms.submit],
    state:term('The real checklist saves a draft, then reviews and submits fresh formal evidence. Practice ratings remain reference only.','Nagse-save ng draft ang tunay na checklist, saka sinusuri at isinusumite ang bagong pormal na ebidensiya. Sanggunian lamang ang practice ratings.')},
  'chapter-gap':{surface:chapter1Terms.review,actions:[chapter1Terms.review,chapter1Terms.nextStep],
    state:term('The real review checks every approved component and current prerequisite. Missing 1.9 evidence remains pending.','Sinusuri ng tunay na review ang bawat inaprubahang bahagi at kasalukuyang paunang kailangan. Nananatiling pending ang kulang na ebidensiya sa 1.9.')},
  'final-review':{surface:chapter1Terms.review,actions:[chapter1Terms.review,chapter1Terms.release],
    state:term('Only the server can release a real Chapter 1 decision and one certificate after rechecking all components. Maria’s SAMPLE has no verification code.','Ang server lamang ang maaaring maglabas ng tunay na pasya sa Kabanata 1 at isang sertipiko matapos muling suriin ang lahat ng bahagi. Walang verification code ang SAMPLE ni Maria.')},
} as const;
