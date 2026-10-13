import Link from 'next/link';
import {NotesMarkdown} from './notes-markdown';
import {LessonFacilitatorGuide} from './facilitator-guide';
import {parseFacilitatorNotes} from '@/lib/elearning/facilitator-guide';
import type {FacilitatorActivity} from '@/lib/elearning/activities';
import type {ObservationIndicator} from '@/lib/elearning/types';

type Lang = 'fil' | 'en';
type View = 'prepare' | 'run';

// Each short card points to the section of the published 1.6.2 guide it condenses.
// Keep this first lesson explicit until its phone and facilitator walkthrough is reviewed.
const cards = {
  prepare: [
    {source:'time-materials', fil:'90 minutong gabay na pagtuturo. Cards at question aid para sa sampung triad, papel at panulat; puwedeng offline at walang projector.', en:'90 guided minutes. Cards and question aids for ten triads, paper and pens; internet and a projector are optional.'},
    {source:'prepare', fil:'Bumuo ng sampung triad para sa 30 kalahok. Sa resident role lamang ibigay ang sagot at pagwawasto. Kathang-isip ang mga scenario.', en:'For 30 participants, form ten triads. Give the answer and correction only to the resident role. Scenarios are fictional.'},
    {source:'opening', fil:'Ihambing ang “Ano ang nangyari?” sa “Ayaw mo bang pumunta?” at balikan ang magalang na pakikinig sa 1.6.1.', en:'Compare “What happened?” with “Did you not want to go?” and connect to respectful listening in 1.6.1.'},
  ],
  run: [
    {source:'steps', fil:'Ipakita ang bukas na tanong, maling hula sa kasama sa biyahe, pagtanggap sa pagwawasto, at pagtiyak sa inayos na buod.', en:'Demonstrate the open question, mistaken travel-companion interpretation, acceptance of correction, and confirmation of the corrected summary.'},
    {source:'practice', fil:'Tatlong 10-minutong round sa triad: basahin ang cards, mag-usap, magbigay ng tiyak na feedback, at ulitin. Bawat isa ay gaganap na BHW nang minsan.', en:'Run three 10-minute triad rounds: read cards, converse, give exact feedback, then retry. Everyone practices as BHW once.'},
    {source:'misconception', fil:'Kung may ipinilit na motibo o maling buod, huminto, itanong ang isang kaugnay na detalye, hintayin ang sagot, at ibalik ang inayos na buod.', en:'If a motive or wrong summary is imposed, pause, ask one relevant detail, allow an answer, and return the corrected summary.'},
    {source:'observe', fil:'Itala ang eksaktong linya, round, observer at prompts. Ang hindi nasaksihan ay “not observed,” hindi mababang marka.', en:'Record exact words, round, observer and prompts. An unseen performance remains “not observed,” not a low grade.'},
    {source:'practice', fil:'Sa 20-minutong pag-ulit, magbigay ng tiyak na prompt. Magtakda ng susunod na direktang obserbasyon para sa hindi nasaksihan.', en:'During the 20-minute retry, give a precise prompt. Schedule later direct observation for unsampled learners.'},
  ],
} satisfies Record<View, Array<{source:string;fil:string;en:string}>>;

export function Chapter1LessonFlow({lang,view,baseHref,returnHref,notesMarkdown,objectives,indicators,activities=[]}:{
  lang:Lang;view:View;baseHref:string;returnHref?:string;notesMarkdown:string|null;
  objectives:string[];indicators:ObservationIndicator[];activities?:FacilitatorActivity[];
}) {
  const pick=(fil:string,en:string)=>lang==='en'?en:fil;
  const sections=parseFacilitatorNotes(notesMarkdown??'');
  const sources=new Map(sections.map(s=>[s.id,s]));
  const criterion=indicators.find(item=>item.objective_index===0);
  const link=(next:View|'lesson')=>`${baseHref}?${new URLSearchParams({view:next,...(returnHref?{returnTo:returnHref}:{})})}`;
  return <section className="space-y-5" aria-label={pick('Daloy ng aralin 1.6.2','Lesson 1.6.2 flow')}>
    <nav className="grid grid-cols-2 gap-2 sm:flex" aria-label={pick('Mga view ng aralin','Lesson views')}>
      {(['prepare','run'] as const).map(next=><Link key={next} prefetch={false} href={link(next)} aria-current={view===next?'page':undefined}
        className={`min-h-11 rounded-md border px-4 py-3 text-center font-medium focus-visible:outline-2 focus-visible:outline-primary ${view===next?'border-primary bg-primary text-on-primary':'border-ink/20'}`}>
        {next==='prepare'?pick('Ihanda','Prepare'):pick('Patakbuhin','Run')}</Link>)}
      <Link prefetch={false} href={link('lesson')} className="col-span-2 min-h-11 rounded-md border border-ink/20 px-4 py-3 text-center underline focus-visible:outline-2 focus-visible:outline-primary">
        {pick('Ipakita sa BHW','Show BHW presentation')}</Link>
    </nav>
    {returnHref && <Link prefetch={false} className="inline-block min-h-11 content-center underline" href={returnHref}>{pick('Bumalik sa working area','Back to working area')}</Link>}
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
      <h2 className="font-semibold">{pick('Layunin ng 1.6.2','1.6.2 objective')}</h2>
      {objectives.length?<ul className="mt-2 list-disc pl-5">{objectives.map((value,i)=><li key={i}>{value}</li>)}</ul>:<p className="mt-2">{pick('Wala pang inilathalang layunin. Tingnan ang buong gabay.','No published objective. Consult the full guide.')}</p>}
      <h3 className="mt-4 font-semibold">{pick('Eksaktong pamantayan sa obserbasyon','Published observation criterion')}</h3>
      {criterion?<p className="mt-2">{pick(criterion.observable_fil,criterion.observable_en)}</p>:<p className="mt-2">{pick('Wala pang inilathalang pamantayan. Huwag magbigay ng rating.','No published criterion. Do not rate performance.')}</p>}
      <p className="mt-2 text-sm text-ink/75">{pick('Gabay sa pagtuturo lamang ito; hindi ito pormal na pagtatasa o pahintulot na magtala.','Teaching guidance only; this is not a formal assessment or permission to record.')}</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {cards[view].filter(card=>sources.has(card.source)).map((card,i)=><article key={`${card.source}-${i}`} className="rounded-xl border border-ink/15 p-4">
        <h3 className="font-semibold">{sources.get(card.source)?.heading}</h3>
        <p className="mt-2 text-sm">{pick(card.fil,card.en)}</p>
      </article>)}
    </div>
    {view==='prepare' && sources.has('time-materials') && <p className="text-sm text-ink/75">{pick('Ang 90 minuto ay mungkahing oras ng pagtuturo. Ang 10–13 minuto ay sariling oras ng pagbabasa; dagdag ang opsyonal na kuwento o pag-ulit.','The 90 minutes are suggested guided delivery. The 10–13 minutes are personal reading time; optional story or replay takes additional time.')}</p>}
    {view==='run' && sources.has('answer-key') && <details className="rounded-xl border border-ink/15 p-4"><summary className="cursor-pointer font-semibold">{pick('Exit check at susunod na hakbang','Exit check and next action')}</summary><div className="mt-3"><NotesMarkdown markdown={sources.get('answer-key')!.body}/></div></details>}
    <details className="rounded-xl border border-ink/15 p-4"><summary className="cursor-pointer font-semibold">{pick('Buong inilathalang gabay at mga sanggunian','Complete published guide and references')}</summary>
      <div className="mt-4"><LessonFacilitatorGuide lang={lang} notesMarkdown={notesMarkdown} activities={activities} indicators={indicators} objectives={objectives}/></div>
    </details>
  </section>;
}
