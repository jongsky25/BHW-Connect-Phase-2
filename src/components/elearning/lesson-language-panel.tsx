import Link from 'next/link';
import type {LessonTranslation,LessonTranslationLanguage} from '@/lib/elearning/lesson-translation';

const names:Record<LessonTranslationLanguage,string>={ceb:'Bisaya (Cebuano)',hil:'Hiligaynon (Ilonggo)'};
export function LessonLanguagePanel({en,options,current,onSelect,compact=false}:{
  en:boolean;options:LessonTranslation[];current?:LessonTranslation;onSelect:(language:string|null)=>void;compact?:boolean;
}){
  const approved=options.filter(t=>t.review_status==='approved');
  const missing=(['ceb','hil']as const).filter(lang=>!approved.some(t=>t.language===lang));
  const label=current?.ui['Wika ng aralin']??(en?'Lesson language':'Wika ng aralin');
  return <section data-lesson-language-panel lang={en?'en':'fil'} aria-label={en?'Lesson language availability':'Mga wikang available sa aralin'} className={compact?'col-span-2 row-start-3 min-w-0 text-sm':'rounded-lg border border-ink/20 bg-canvas p-3 text-sm leading-relaxed text-ink'}>
    {options.length>0?<label className="flex min-w-0 flex-wrap items-center gap-2 font-medium">
      <span lang={current?.language??(en?'en':'fil')}>{label}</span>
      <select className="min-h-[44px] min-w-0 max-w-full rounded border border-ink/20 bg-canvas px-3" value={current?.language??''} onChange={event=>onSelect(event.target.value||null)}>
        <option value="">{en?'English':'Filipino'}</option>
        {options.map(t=><option key={t.language} value={t.language} lang={t.language}>{t.label}</option>)}
      </select>
    </label>:<p className="font-medium">{en?'Lesson languages: English and Filipino.':'Mga wika ng aralin: English at Filipino.'}</p>}
    {!compact&&options.length>0&&<p className="mt-2">{en?'English and Filipino are available. Additional lesson languages: ':'May English at Filipino. Mga karagdagang wika ng aralin: '}{approved.map(t=>t.label).join(', ')||(en?'awaiting review':'hinihintay pa ang pagsusuri')}.</p>}
    {!compact&&missing.length>0&&<p className={compact?'mt-1':'mt-2'}>{en?'Awaiting reviewed translations for this lesson version: ':'Hinihintay pa ang nasuring salin para sa bersiyong ito ng aralin: '}{missing.map(lang=>names[lang]).join(', ')}.</p>}
    {!compact&&<p className="mt-2"><Link prefetch={false} className="underline underline-offset-2" href="/settings">{en?'Change English / Filipino in Settings':'Baguhin ang English / Filipino sa Settings'}</Link>.</p>}
    {options.some(t=>t.review_status==='draft')&&<p className="mt-2">{en?'Draft options are for staff review.':'Para sa pagsusuri ng staff ang mga draft na pagpipilian.'}</p>}
  </section>;
}
