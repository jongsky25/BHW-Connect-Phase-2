import {timingsMatchSection} from '@/lib/elearning/narration-zones';
import type {LessonNarration} from '@/lib/elearning/reference-narration';
import type {PublishedLesson} from '@/lib/elearning/reference-navigation';
import {presentationSourceHash} from '@/lib/elearning/feedback-wording-release';

const reviewed={
  'bhw-legal-role':{hash:'7a4880da236ea31a78647bb447ba6ff66eb7be701eb442059c3fabf77eddc57e',first:'section-1'},
  'problem-prioritize':{hash:'ca5834ca03409c356d8f4b0b9d2a3187db7d3753f16e58cdaa24e2863c77c5f9',first:'criteria'},
};
export function NarrationAccessGuide({lesson:publishedLesson,position,narration,en,slides,translated,illustrated}:{
  lesson:PublishedLesson;position:string;narration?:LessonNarration;en:boolean;slides:boolean;translated:boolean;illustrated:boolean;
}){
  const lesson={...publishedLesson,revision:{...publishedLesson.revision,content_hash:presentationSourceHash(publishedLesson.lesson_key,publishedLesson.revision.content_hash)}};
  if(!translated&&lesson.lesson_key==='bhs-decline'&&lesson.revision.content_hash==='7cb6adc492551052091fa523d59249c9350cf64a4cf32307d8cbc4229a3898b3'&&position===(slides?'slide-section-4':'section-4')){
    const read=lesson.revision.read_sections.find(s=>s.id==='section-4');
    const slide=lesson.revision.slides.find(s=>s.id==='slide-section-4');
    if(read?.body_en.includes('The company representative returns to the BHS')&&(!slides||slide?.narration_en?.includes('The company representative returns to the BHS')))return <p role="note" className="my-3 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm">
      {en?'In this example, a visitor offers infant-formula samples, a product poster and a gift in return for promotion. Their job title gives no special permission at the BHS. Assess the offer under the Milk Code.':'Sa halimbawang ito, may bisitang nag-aalok ng infant-formula samples, product poster at regalo kapalit ng promosyon. Hindi nagbibigay ng espesyal na pahintulot sa BHS ang kaniyang titulo. Suriin ang alok ayon sa Milk Code.'}
    </p>;
  }
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
  if(!translated&&lesson.lesson_key==='safety-identify'&&['ac7ab4b403d1a7d18699b2be524b02381f018ea639ddc92a98fb9cb0fdbc408e','f4ddc98beedc20f35572f5d6c270d32a551a63ea6d55bebb093af96ecbab8a8d'].includes(lesson.revision.content_hash)&&position===(slides?'slide-ana':'ana')){
    const read=lesson.revision.read_sections.find(s=>s.id==='ana');
    const slide=lesson.revision.slides.find(s=>s.id==='slide-ana');
    if(read?.body_fil.includes('fill line')&&read.body_fil.includes('agarang kontrol')&&(!slides||slide?.display_fil.includes('fill line')))return <p role="note" className="my-3 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm">
      {en?'A “sharps box” holds used needles and other sharp medical items. Its “fill line” marks how full it may safely be. An “immediate control” is a safe first step to reduce risk while the responsible staff is informed; do not handle the box contents.':'Ang “sharps box” ay lalagyan ng gamit na karayom at iba pang matutulis na gamit. Ang “fill line” ang hangganan ng pagpuno nito. Ang “agarang kontrol” ay unang ligtas na hakbang para mabawasan ang panganib habang inaabisuhan ang tamang staff; huwag hawakan ang laman ng lalagyan.'}
    </p>;
  }
  if(!translated&&lesson.lesson_key==='safety-prepare'&&lesson.revision.content_hash==='8a11e4d0539e9db0e7c0dc7792c2974c50734eb2df100c2dac16732af0a828c2'&&position===(slides?'slide-field-preparation':'field-preparation')){
    const read=lesson.revision.read_sections.find(s=>s.id==='field-preparation');
    const slide=lesson.revision.slides.find(s=>s.id==='slide-field-preparation');
    if(read?.body_fil.includes('Kumpirmahin ang ruta, reporting contact at inaasahang oras ng balik.')&&(!slides||slide?.display_fil.includes('contact at balik: kumpirmahin bago umalis')))return <p role="note" className="my-3 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm">
      {en?'Who should know the route? Before departure, tell the locally designated reporting contact your confirmed route and expected return time. This may be the supervisor if locally assigned. If you do not know the contact or a safe route, pause the affected visit and confirm both with the supervisor first.':'Kanino ipapaalam ang ruta? Bago umalis, ipaalam sa itinalagang reporting contact ang nakumpirmang ruta at inaasahang oras ng balik. Maaaring ang supervisor ito kung siya ang itinalaga sa lugar. Kung hindi alam ang contact o ligtas na ruta, ihinto muna ang apektadong pagbisita at tiyakin ang dalawa sa supervisor.'}
    </p>;
  }
  if(!translated&&lesson.lesson_key==='resources-monitor'&&lesson.revision.content_hash==='f7fdbf134d5ee125d9648fd58557a5a512cb9fbfeea985c79736fd7287857ff6'&&position===(slides?'slide-trial':'trial')){
    const read=lesson.revision.read_sections.find(s=>s.id==='trial');
    const slide=lesson.revision.slides.find(s=>s.id==='slide-trial');
    if(read?.body_fil.includes('bago bawat print run')&&(!slides||slide?.narration_fil?.includes('bago bawat print run')))return <p role="note" className="my-3 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm">
      {en?'“Before each print run” means check the approved handout and version before printing a batch; it does not mean that phrase refers to every physical page. If another handout or version is printed, check that one too. Follow the local document-control procedure; this proposed routine still needs approval.':'Ang “bago bawat print run” ay bago ang bawat batch ng pag-print: tiyakin muna ang aprubadong handout at bersyon. Hindi bawat pahina ng iisang batch ang tinutukoy ng parirala. Kung ibang handout o bersyon ang ipi-print, tiyakin din iyon. Sundin ang lokal na document-control procedure; kailangan pa rin ng pahintulot para sa mungkahing routine na ito.'}
    </p>;
  }
  if(!translated&&lesson.lesson_key==='communication-clarify'&&lesson.revision.content_hash==='26c6c781e7c76dfd4a911d20eafe49ff65d4e252224f8bcbf2544373ab4eaefe'){
    const read=lesson.revision.read_sections.find(s=>s.id==='open-question');
    const slide=lesson.revision.slides.find(s=>s.id==='slide-open-question');
    if(position===(slides?'slide-open-question':'open-question')&&read?.heading_fil==='Bukas muna, saka linawin'&&(!slides||slide?.heading_fil==='Bukas muna, saka linawin'))return <p role="note" className="my-3 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm">
      {en?'Stay open first, then seek clarity: invite the person to tell their story in their own words, then clarify one detail. “Bukas” means open to their answer, not tomorrow.':'Maging bukas muna, hanapin ang linaw: pakinggan ang kuwento ng kausap sa sarili niyang salita, saka maglinaw ng isang detalye. Ang “bukas” dito ay pagiging bukas sa sagot, hindi kinabukasan.'}
    </p>;
    const barriers=lesson.revision.read_sections.find(s=>s.id==='barriers');
    const barriersSlide=lesson.revision.slides.find(s=>s.id==='slide-barriers');
    if(position===(slides?'slide-barriers':'barriers')&&barriers?.body_fil.includes('Sa kasong Rosario sa Modyul 7')&&(!slides||barriersSlide?.narration_fil?.includes('Sa kasong Rosario sa Modyul 7')))return <p role="note" className="my-3 rounded-lg border border-ink/20 bg-ink/5 p-3 text-sm">
      {en?'Coming up in Module 7: Rosario is a child in a historical case study. Her family faced poverty, misinformation and gaps in health services. The case is used to examine connected barriers without blaming the family; the full story comes later.':'Sa susunod na Modyul 7: si Rosario ay bata sa isang makasaysayang case study. Nakaharap ang pamilya niya sa kahirapan, maling impormasyon at kakulangan sa serbisyong pangkalusugan. Ginagamit ang kaso upang suriin ang magkakaugnay na hadlang nang hindi sinisisi ang pamilya; susunod pa ang buong kuwento.'}
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
