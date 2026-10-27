import {timingsMatchSection} from '@/lib/elearning/narration-zones';
import type {LessonNarration} from '@/lib/elearning/reference-narration';
import type {PublishedLesson} from '@/lib/elearning/reference-navigation';

const reviewed={
  'bhw-legal-role':{hash:'7a4880da236ea31a78647bb447ba6ff66eb7be701eb442059c3fabf77eddc57e',first:'section-1'},
  'problem-prioritize':{hash:'ca5834ca03409c356d8f4b0b9d2a3187db7d3753f16e58cdaa24e2863c77c5f9',first:'criteria'},
};
export function NarrationAccessGuide({lesson,position,narration,en,slides,translated,illustrated}:{
  lesson:PublishedLesson;position:string;narration?:LessonNarration;en:boolean;slides:boolean;translated:boolean;illustrated:boolean;
}){
  const finalRead=lesson.revision.read_sections.at(-1);
  const finalSlide=lesson.revision.slides.at(-1);
  if(!translated&&lesson.revision.read_sections.length===7&&lesson.revision.slides.length===7&&
    finalRead?.id==='next-step'&&finalSlide?.id==='slide-next-step'&&
    finalRead.heading_en==='On Monday, try this'&&finalRead.heading_fil==='Sa Lunes, gawin ito'&&
    finalSlide.heading_en==='On Monday, try this'&&finalSlide.heading_fil==='Sa Lunes, gawin ito'&&
    position===(slides?'slide-next-step':'next-step'))return <p role="note" className="my-3 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm">
      {en?'Why Monday? This is a prompt to practise the lesson’s next step, not a deadline. If your next training or workday is different, plan the safe step with your facilitator or local team for that day and confirm local procedures first.':'Bakit Lunes? Paalala ito na sanayin ang susunod na hakbang ng aralin, hindi takdang araw. Kung iba ang susunod mong araw ng pagsasanay o trabaho, planuhin ang ligtas na hakbang kasama ang facilitator o lokal na team sa araw na iyon at tiyakin muna ang lokal na patakaran.'}
    </p>;
  if(!translated&&lesson.lesson_key==='resources-safe-change'&&lesson.revision.content_hash==='569fd058a90394940f91c6725f9f3076c225d0acafb81320d8d6b63ed81a6b15'&&position===(slides?'slide-utilities':'utilities')){
    const read=lesson.revision.read_sections.find(s=>s.id==='utilities');
    const slide=lesson.revision.slides.find(s=>s.id==='slide-utilities');
    if(read?.body_en.includes('Charlaine is a BHW in this fictional story.')&&(!slides||slide?.narration_en?.includes('Charlaine is a BHW in this fictional story.')))return <p role="note" className="my-3 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm">
      {en?'Practice case: Charlaine and the sample records and choices in this lesson are fictional. For real work, follow current facility procedures and confirm decisions with the authorized person.':'Kaso para sa pagsasanay: kathang-isip si Charlaine at ang mga sample na tala at pagpipilian sa araling ito. Para sa tunay na gawain, sundin ang kasalukuyang patakaran ng pasilidad at kumpirmahin ang desisyon sa awtorisadong tao.'}
    </p>;
  }
  if(!translated&&slides&&lesson.lesson_key==='uhc-coverage'&&lesson.revision.content_hash==='4b82aa20c75ff944adf326932408fd64ca126ac0dea951d53da264f00a639326'&&position==='slide-included'){
    const slide=lesson.revision.slides.find(s=>s.id==='slide-included');
    if(slide?.display_fil.includes('Sinasagot nito kung sino ang kasama sa programa.'))return <p role="note" className="my-3 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm">
      {en?'Automatic inclusion says who belongs to PhilHealth. It does not confirm that this consultation is free at the chosen facility; check the specific benefit first.':'Ang awtomatikong pagsama ay nagsasabi kung sino ang kasama sa PhilHealth. Hindi pa nito tiyak kung libre ang konsultang ito sa napiling pasilidad; alamin muna ang sakop na benepisyo.'}
    </p>;
  }
  if(!translated&&lesson.lesson_key==='safety-identify'&&lesson.revision.content_hash==='ac7ab4b403d1a7d18699b2be524b02381f018ea639ddc92a98fb9cb0fdbc408e'&&position===(slides?'slide-ana':'ana')){
    const read=lesson.revision.read_sections.find(s=>s.id==='ana');
    const slide=lesson.revision.slides.find(s=>s.id==='slide-ana');
    if(read?.body_fil.includes('fill line')&&read.body_fil.includes('agarang kontrol')&&(!slides||slide?.display_fil.includes('fill line')))return <p role="note" className="my-3 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm">
      {en?'A “sharps box” holds used needles and other sharp medical items. Its “fill line” marks how full it may safely be. An “immediate control” is a safe first step to reduce risk while the responsible staff is informed; do not handle the box contents.':'Ang “sharps box” ay lalagyan ng gamit na karayom at iba pang matutulis na gamit. Ang “fill line” ang hangganan ng pagpuno nito. Ang “agarang kontrol” ay unang ligtas na hakbang para mabawasan ang panganib habang inaabisuhan ang tamang staff; huwag hawakan ang laman ng lalagyan.'}
    </p>;
  }
  const termHelp={
    'bhw-barangay-partners':{
      hash:'4751c8f2e136581fe65913f6bf1da83615bb679caa0fb1c1d62072acc2625a3e',
      read:'section-5',slide:'slide-section-5',term:'papel ng katuwang',
      en:'In the Filipino heading, “papel” means a partner’s role or responsibility in health work, not a sheet of paper.',
      fil:'Dito, ang “papel” ay gampanin o tungkulin ng katuwang sa gawaing pangkalusugan, hindi papel na sinusulatan.',
    },
    'bhw-legal-role':{
      hash:'7a4880da236ea31a78647bb447ba6ff66eb7be701eb442059c3fabf77eddc57e',
      read:'status-and-other-processes',slide:'slide-status-and-other-processes',term:'clinical licence',
      en:'Here “clinical licence” means a professional licence for clinical practice. BHW accreditation alone does not grant one.',
      fil:'Dito, ang “clinical licence” ay propesyonal na lisensiya para sa gawaing klinikal. Hindi ito awtomatikong ibinibigay ng akreditasyon bilang BHW.',
    },
    'bhw-records':{
      hash:'cc1933a880a7eda36a3e0c2b28b635e9b0d565be836384a23f8aa96b2e828be6',
      read:'household-profile',slide:'household-profile-slide',term:'fields',
      en:'“Fields” here means the spaces for information on a form, not outdoor areas.',
      fil:'Dito, ang “fields” ay mga puwang na lalagyan ng impormasyon sa form, hindi lugar na pupuntahan.',
    },
    'bhs-resources':{
      hash:'50d1cc9c7ca02df872f15e50a6cb90a14dd0307b0a7fde3f08d88a96edcabf31',
      read:'section-5',slide:'slide-section-5',term:'rekurso',
      en:'“Resources” here means the electricity, water and supplies available at the BHS. Check what the service needs and the local rules before suggesting a reduction.',
      fil:'Ang “rekurso” dito ay mga magagamit sa BHS, gaya ng kuryente, tubig at suplay. Alamin muna ang kailangan ng serbisyo at ang lokal na tuntunin bago magmungkahi ng pagbabawas.',
    },
    'bhs-support-environment':{
      hash:'9c3ff8755423c094af0bd5514c41b8ba685940e2597e5e91561568b9a48bd92a',
      read:'facility-roles',slide:'slide-facility-roles',term:'nagtatatag',
      en:'“Establish” here means arrange a lactation station that meets the requirements. The institution is responsible; the BHW checks the suitable space and trained contact with the midwife or supervisor.',
      fil:'Ang “nagtatatag” dito ay paglalaan at paghahanda ng lactation station ayon sa mga tuntunin. Institusyon ang may pananagutan; itatanong ng BHW sa midwife o supervisor ang angkop na lugar at sinanay na contact.',
    },
  }[lesson.lesson_key as 'bhw-barangay-partners'|'bhw-legal-role'|'bhw-records'|'bhs-resources'|'bhs-support-environment'];
  if(!translated&&termHelp&&lesson.revision.content_hash===termHelp.hash&&position===(slides?termHelp.slide:termHelp.read)){
    const section=lesson.revision.read_sections.find(s=>s.id===termHelp.read);
    const slide=lesson.revision.slides.find(s=>s.id===termHelp.slide);
    const readText=[section?.heading_fil,section?.body_fil].join(' ');
    const slideText=[slide?.heading_fil,slide?.display_fil,slide?.narration_fil].join(' ');
    if(readText.includes(termHelp.term)&&(!slides||slideText.includes(termHelp.term)))return <p role="note" className="my-3 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm">
      {en?termHelp.en:termHelp.fil}
    </p>;
  }
  if(!translated&&lesson.lesson_key==='bhs-promotions'&&position===(slides?'slide-':'')+'section-2'){
    const read=lesson.revision.read_sections.find(s=>s.id==='section-2');
    const slide=lesson.revision.slides.find(s=>s.id==='slide-section-2');
    if(read?.body_en.includes('feeding bottles and teats')&&slide?.narration_en?.includes('feeding bottles and teats'))return <p role="note" className="my-3 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm">
      {en?'In the Milk Code, “teats” means the nipples fitted to feeding bottles; it does not mean “treats” or medicines.':'Sa Milk Code, ang “teats” ay mga tsupon ng feeding bottle; hindi ito “treats” o gamot.'}
    </p>;
  }
  if(translated||!Object.hasOwn(reviewed,lesson.lesson_key))return null;
  const expected=reviewed[lesson.lesson_key as keyof typeof reviewed];
  const section=lesson.revision.read_sections.find(s=>s.id===expected.first),track=narration?.[expected.first];
  if(lesson.revision.content_hash!==expected.hash||position!==(slides?'slide-':'')+expected.first||!section||!track||!timingsMatchSection(track.timings,{heading:section[en?'heading_en':'heading_fil'],body:section[en?'body_en':'body_fil'],takeaway:section[en?'takeaway_en':'takeaway_fil']??''}))return null;
  return <aside data-narration-access-guide aria-label={en?'Where to find narration':'Saan makikita ang salaysay'} className="my-3 rounded-lg border border-ink/20 bg-canvas p-3 text-sm leading-relaxed text-ink">
    <p>{slides?(en?'For the full recording, open “Full narration and audio” below, then press Listen. Read shows Listen directly.':'Para sa buong recording, buksan ang “Buong salaysay at audio” sa ibaba, saka pindutin ang Pakinggan. Nasa Basahin mismo ang Pakinggan.'):(en?'Press Listen below to hear this section. The final check’s recording becomes available after you choose an answer.':'Pindutin ang Pakinggan sa ibaba para marinig ang bahaging ito. Magiging available ang recording ng huling tanong matapos kang pumili ng sagot.')}</p>
    {illustrated&&<p className="mt-2">{en?'Illustrated narrated lesson has five teaching sections in your selected language. Answer the final self-check separately in Read or Slides.':'May limang bahaging panturo ang Araling may larawan at salaysay sa napili mong wika. Sagutin nang hiwalay ang huling tanong sa Basahin o Slides.'}</p>}
  </aside>;
}
