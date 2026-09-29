import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chapterRoot = path.join(root, 'content/training/chapter3-core-competencies');
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, value) => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n'); };
const blueprintPath = path.join(chapterRoot, 'chapter-blueprint.json');
const blueprint = json(blueprintPath);
const cards = json(path.join(chapterRoot, 'lesson-cards.json'));
const definitions = new Map(blueprint.modules.flatMap(m => m.lessons.map(l => [l.code, { module: m, lesson: l }])));
const required = ['title_fil','case_fil','case_en','action_fil','action_en','example_fil','example_en','risk_fil','risk_en','next_fil','next_en','wrong_fil','wrong_en','indicator_fil','indicator_en'];
const seen = new Set();
const firstSentence = text => text.split(/(?<=[.!?])\s+/u)[0];
const sourceList = pages => Object.entries(pages).flatMap(([prefix, values]) => values.map(n => `${prefix}${n}`)).join(', ');
const heading = (id, title, body) => `## [${id}] ${title}\n\n${body}\n`;
const check = (card, stage) => {
  const initial = stage === 'start';
  const right = initial ? card.action : card.indicator;
  const wrong = card.wrong;
  const fil = initial ? 'Ano ang pinakamainam na gagawin ng BHW sa sitwasyong ito?' : 'Aling kilos ang nagpapakita ng maayos na pagtupad?';
  const en = initial ? 'What should the BHW do in this situation?' : 'Which action shows the task was done well?';
  const options = initial
    ? [{ fil: wrong.fil, en: wrong.en }, { fil: firstSentence(right.fil), en: firstSentence(right.en) }, { fil: 'Ipagpaliban nang walang plano o pag-follow-up.', en: 'Delay without a plan or follow-up.' }]
    : [{ fil: firstSentence(right.fil), en: firstSentence(right.en) }, { fil: 'Sabihing natapos ang gawain kahit walang naitalang resulta.', en: 'Say the task is complete without recording an outcome.' }, { fil: wrong.fil, en: wrong.en }];
  return {
    prompt_fil: fil, prompt_en: en, options, correct_option_index: initial ? 1 : 0,
    feedback_fil: initial ? `1: Hindi ito ligtas o hindi nakumpirma. 2: Ito ang angkop na unang hakbang. 3: Walang malinaw na susunod na hakbang.` : `1: Ito ang nakikitang patunay ng gawain. 2: Walang naitalang resulta. 3: Hindi ito ang angkop na kilos.`,
    feedback_en: initial ? `1: This is unsafe or unconfirmed. 2: This is the appropriate first step. 3: No next step is arranged.` : `1: This is observable evidence of the task. 2: There is no recorded result. 3: This is not the appropriate action.`,
  };
};

for (const card of cards) {
  if (seen.has(card.code) || !definitions.has(card.code)) throw new Error(`Unknown or duplicate card ${card.code}`);
  seen.add(card.code);
  for (const field of required) if (typeof card[field] !== 'string' || !card[field].trim()) throw new Error(`${card.code}: missing ${field}`);
  const { module, lesson } = definitions.get(card.code);
  card.action = { fil: card.action_fil, en: card.action_en };
  card.wrong = { fil: card.wrong_fil, en: card.wrong_en };
  card.indicator = { fil: card.indicator_fil, en: card.indicator_en };
  const concept = `c3.${lesson.lesson_key}`;
  const sectionData = [
    ['scene','Ang sitwasyon','The situation',card.case_fil,card.case_en],
    ['action','Gawin at sabihin','What to do and say',card.action_fil,card.action_en],
    ['check-start','Piliin ang tugon','Choose a response','Pumili muna ng sagot. Pagkatapos, basahin ang dahilan.','Choose an answer first. Then read the reason.'],
    ['example','Halimbawa','Worked example',card.example_fil,card.example_en],
    ['scope','Saklaw at kaligtasan','Scope and safety',card.risk_fil,card.risk_en],
    ['check-transfer','Subukan sa gawain','Apply the task','Piliin ang kilos na may nakikitang resulta.','Choose the action with an observable result.'],
    ['next-step','Gawin sa trabaho','Use this at work',card.next_fil,card.next_en],
  ];
  const startCheck = check(card, 'start'), transferCheck = check(card, 'transfer');
  const sections = sectionData.map(([id, , , fil, en]) => ({ id, concept_ids: [concept], asset_ids: [], takeaway_fil: firstSentence(fil), takeaway_en: firstSentence(en), check: id === 'check-start' ? startCheck : id === 'check-transfer' ? transferCheck : null }));
  const slides = sectionData.map(([id, filTitle, enTitle, fil, en]) => ({
    id: `slide-${id}`, concept_ids: [concept], asset_ids: [], layout: id.startsWith('check') ? 'decision' : id === 'scene' ? 'scene' : id === 'scope' ? 'comparison' : 'process',
    heading_fil: filTitle, heading_en: enTitle,
    display_fil: `${filTitle}\n${firstSentence(fil).slice(0, 205)}`,
    display_en: `${enTitle}\n${firstSentence(en).slice(0, 205)}`,
    check: id === 'check-start' ? startCheck : id === 'check-transfer' ? transferCheck : null,
    narration_fil: fil, narration_en: en,
  }));
  const sourceIds = Object.keys(lesson.source_pages).map(k => k === 'R' ? 'reference-manual' : 'facilitator-guide');
  const sources = Object.entries(lesson.source_pages).map(([k, pages]) => ({ id: k === 'R' ? 'reference-manual' : 'facilitator-guide', title: k === 'R' ? 'BHW Reference Manual (2022)' : 'BHW Facilitator Guide (2022)', pdf_pages: pages }));
  const lessonDir = path.join(chapterRoot, 'drafts', module.module_key, 'lessons', lesson.lesson_key);
  const manifest = { lesson_key: lesson.lesson_key, position: Number(lesson.code.split('.')[2]) - 1, title_fil: card.title_fil, title_en: lesson.title_en, objectives_fil: [card.action_fil], objectives_en: [lesson.objective_en], required: true };
  const coverage = [{ id: concept, read_ids: sections.map(s => s.id), slide_ids: slides.map(s => s.id), source_ids: sourceIds }];
  write(path.join(lessonDir, 'lesson.json'), { manifest, sections, coverage, sources, assets: [] });
  for (const lang of ['fil','en']) write(path.join(lessonDir, `read.${lang}.md`), sectionData.map(([id, filTitle, enTitle, fil, en]) => heading(id, lang === 'fil' ? filTitle : enTitle, lang === 'fil' ? fil : en)).join('\n'));
  write(path.join(lessonDir, 'slides.json'), slides);
  const levels = {
    kaya_na_fil: card.indicator_fil, kaya_na_en: card.indicator_en,
    kailangan_practice_fil: `Nagawa ang pangunahing hakbang ngunit kailangan ng paalala o pagwawasto sa pag-follow-up.`,
    kailangan_practice_en: `Completes the main step but needs a prompt or correction on follow-up.`,
    hindi_pa_fil: card.wrong_fil, hindi_pa_en: card.wrong_en,
  };
  const indicator = { objective_index: 0, observable_fil: card.indicator_fil, observable_en: card.indicator_en, not_yet_fil: card.wrong_fil, not_yet_en: card.wrong_en, levels };
  write(path.join(lessonDir, 'competency.json'), { observation_indicators: [indicator] });
  write(path.join(lessonDir, 'practice.json'), { activity_id: `activity-${lesson.lesson_key}`, objective_id: `${lesson.lesson_key}.objective-1`, setting: 'simulation', formative: true, checks: [{ section_id: 'check-start', feedback_by_option: [0,1,2].map(i => ({ fil: startCheck.feedback_fil.split(/\d: /u)[i+1] ?? '', en: startCheck.feedback_en.split(/\d: /u)[i+1] ?? '' })) }, { section_id: 'check-transfer', feedback_by_option: [0,1,2].map(i => ({ fil: transferCheck.feedback_fil.split(/\d: /u)[i+1] ?? '', en: transferCheck.feedback_en.split(/\d: /u)[i+1] ?? '' })) }] });
  for (const lang of ['fil','en']) {
    const isFil = lang === 'fil';
    const title = isFil ? card.title_fil : lesson.title_en;
    const caseText = isFil ? card.case_fil : card.case_en;
    const action = isFil ? card.action_fil : card.action_en;
    const example = isFil ? card.example_fil : card.example_en;
    const risk = isFil ? card.risk_fil : card.risk_en;
    const next = isFil ? card.next_fil : card.next_en;
    const wrong = isFil ? card.wrong_fil : card.wrong_en;
    const label = isFil ? 'Kaya na' : 'Competent';
    const guide = [
      heading('purpose', isFil ? 'Layunin' : 'Purpose', `${title}: ${indicator[`observable_${lang}`]}`),
      heading('time-materials', isFil ? 'Oras at kagamitan' : 'Time and materials', isFil ? 'Gamitin ang oras na itinakda sa activity plan. Ihanda ang kathang-isip na case card, lokal na gabay, observer sheet at job aid.' : 'Use the time in the activity plan. Prepare the fictional case card, local protocol, observer sheet and job aid.'),
      heading('prepare', isFil ? 'Paghahanda' : 'Prepare', risk),
      heading('opening', isFil ? 'Panimula' : 'Opening', caseText),
      heading('steps', isFil ? 'Mga hakbang' : 'Steps', `${action}\n\n${example}`),
      heading('expected-answers', isFil ? 'Inaasahang sagot' : 'Expected answers', action),
      heading('misconception', isFil ? 'Karaniwang maling akala' : 'Common misconception', wrong),
      heading('practice', isFil ? 'Pagsasanay' : 'Practice', `${lesson.practice_en}\n\n${isFil ? 'Mag-obserba, magbigay ng feedback at ulitin ang kritikal na hakbang.' : 'Observe, give feedback and repeat the critical action.'}`),
      heading('answer-key', isFil ? 'Sagot sa mga check' : 'Check answer key', isFil ? 'Unang check: ikalawang sagot. Ikalawang check: unang sagot. Talakayin ang dahilan ng bawat pagpipilian.' : 'First check: second option. Second check: first option. Discuss the reason for each choice.'),
      heading('observe', isFil ? 'Obserbahan' : 'Observe', `${label}: ${indicator[`observable_${lang}`]}\n\n${indicator.levels[`kailangan_practice_${lang}`]}\n\n${indicator.levels[`hindi_pa_${lang}`]}`),
      heading('support', isFil ? 'Dagdag na tulong' : 'Support', isFil ? 'Ipakita muli ang nawawalang hakbang at bigyan ng pagkakataong ulitin sa kathang-isip na kaso.' : 'Model the missing step again and allow another attempt with the fictional case.'),
      heading('sources-review', isFil ? 'Mga sanggunian' : 'Sources', `${sourceList(lesson.source_pages)}. ${next}`),
    ].join('\n');
    write(path.join(lessonDir, `facilitator.${lang}.md`), guide);
    write(path.join(lessonDir, `participant-cards.${lang}.md`), `# ${title}\n\n${caseText}\n\n${isFil ? 'Gawain' : 'Task'}: ${action}\n`);
    write(path.join(lessonDir, `observer-sheet.${lang}.md`), `# ${title}\n\n${indicator[`observable_${lang}`]}\n\n- ${isFil ? 'Kaya na' : 'Competent'}: ${indicator.levels[`kaya_na_${lang}`]}\n- ${isFil ? 'Kailangan ng practice' : 'Needs practice'}: ${indicator.levels[`kailangan_practice_${lang}`]}\n- ${isFil ? 'Hindi pa' : 'Not yet'}: ${indicator.levels[`hindi_pa_${lang}`]}\n`);
  }
  lesson.status = 'authored-draft';
  lesson.title_fil = card.title_fil;
}

for (const module of blueprint.modules) {
  const selected = module.lessons.filter(l => seen.has(l.code));
  if (!selected.length) continue;
  const dir = path.join(chapterRoot, 'drafts', module.module_key);
  const moduleCards = selected.map(l => cards.find(c => c.code === l.code));
  write(path.join(dir, 'module.json'), { id: module.module_key, position: Number(module.code.split('.')[1]) - 1, title_fil: module.title_fil, title_en: module.title_en, objectives_fil: moduleCards.map(c => c.action_fil), objectives_en: selected.map(l => l.objective_en), summary_fil: `${module.title_fil}: ${selected.length} aralin na may kaso, pagsasanay at observer sheet.`, summary_en: `${module.title_en}: ${selected.length} lessons with cases, practice and observer sheets.` });
  write(path.join(dir, 'coverage.json'), { concepts: selected.map(l => ({ id: `c3.${l.lesson_key}`, statement_en: l.objective_en, source: sourceList(l.source_pages), redundant_with: null })) });
  const allocated = module.source_allocation_hours * 60;
  const perLesson = Math.floor(allocated / selected.length);
  const extra = allocated % selected.length;
  write(path.join(dir, 'activities.json'), { source_allocation_hours: module.source_allocation_hours, planning_split: ['3.1','3.2'].includes(module.code) ? 'Shared eight-hour source block; provisional three/five-hour split' : null, activities: selected.map((l, i) => ({ id: `activity-${l.lesson_key}`, lesson_key: l.lesson_key, kind: 'facilitated-practice-and-observation', setting: 'simulation', minutes: perLesson + (i < extra ? 1 : 0), objective_index: i, indicator_ref: `lessons/${l.lesson_key}/competency.json#/observation_indicators/0`, materials: ['participant-cards','observer-sheet','approved-local-job-aid'], privacy: 'fictional cases only', source_pages: l.source_pages })) });
  const indicators = selected.map((l, i) => ({ ...json(path.join(dir, 'lessons', l.lesson_key, 'competency.json')).observation_indicators[0], objective_index: i }));
  write(path.join(dir, 'competency.json'), { competency_statement_fil: `${module.title_fil}: isinasagawa ang mga gawain sa araling ito ayon sa kasalukuyang lokal na gabay, may paggalang sa pahintulot, privacy at saklaw ng BHW.`, competency_statement_en: `${module.title_en}: performs the unit tasks using current local guidance, consent, privacy and BHW scope boundaries.`, observation_indicators: indicators });
  write(path.join(dir, 'facilitator-activities.json'), selected.flatMap((l, i) => {
    const c = moduleCards[i];
    const total = perLesson + (i < extra ? 1 : 0);
    const slots = Math.ceil(total / 180);
    const base = Math.floor(total / slots);
    return Array.from({ length: slots }, (_, slot) => ({
      id: `c3-${l.lesson_key}-part-${slot + 1}`, version: 1, title: { fil: `${c.title_fil} — bahagi ${slot + 1}`, en: `${l.title_en} — part ${slot + 1}` }, lesson_keys: [l.lesson_key], source_pages: l.source_pages.F,
      kind: 'practical', minutes: base + (slot < total % slots ? 1 : 0), objective_indices: [i], optional: true, choice_group: null,
      purpose: { fil: c.action_fil, en: l.objective_en },
      group_size: { fil: 'Tatluhan: BHW, residente at tagamasid; magpalit ng papel.', en: 'Triads: BHW, resident and observer; rotate roles.' },
      materials: [{ fil: 'Kathang-isip na participant card', en: 'Fictional participant card' }, { fil: 'Observer sheet at kasalukuyang lokal na gabay', en: 'Observer sheet and current local guide' }],
      steps: [
        { fil: `Basahin ang kaso: ${c.case_fil}`, en: `Read the case: ${c.case_en}` },
        { fil: 'Ipagawa ang unang desisyon bago ipakita ang paliwanag.', en: 'Ask for the first decision before showing the explanation.' },
        { fil: `Ipakita o sabihin ang gawain: ${c.action_fil}`, en: `Demonstrate or explain the task: ${c.action_en}` },
        { fil: 'Gamitin ang observer sheet, magbigay ng isang tiyak na pagwawasto at ulitin ang kritikal na hakbang.', en: 'Use the observer sheet, give one specific correction and repeat the critical step.' },
      ],
      debrief: [{ fil: 'Aling bahagi ang nakumpirma sa lokal na gabay, at ano ang kailangang i-refer?', en: 'Which part was confirmed in the local guide, and what needs referral?' }],
      observe: [{ fil: c.indicator_fil, en: c.indicator_en }, { fil: c.wrong_fil, en: c.wrong_en }],
      output: { fil: 'Isang nakumpletong observer sheet bawat kalahok.', en: 'One completed observer sheet per learner.' },
      alternative: { fil: 'Kung walang tatluhan, ipagawa nang paisa-isa sa facilitator at itala ang parehong indicator.', en: 'If triads are unavailable, observe each learner individually against the same indicator.' },
      worksheet: [{ fil: 'Isulat ang ginawa, feedback ng observer at hakbang na uulitin.', en: 'Write the action taken, observer feedback and step to retry.' }],
    }));
  }));
  for (const lang of ['fil','en']) {
    const isFil = lang === 'fil';
    const notes = [
      heading('purpose', isFil ? 'Layunin' : 'Purpose', isFil ? module.title_fil : module.title_en),
      heading('time', isFil ? 'Oras' : 'Time', isFil ? `${module.source_allocation_hours} oras ng pinangangasiwaang pagsasanay ang inilaan sa plano. Hindi ito awtomatikong katumbas ng digital na oras.` : `${module.source_allocation_hours} hours are allocated to facilitated practice in this plan. This does not equal digital study time.`),
      heading('prepare', isFil ? 'Ihanda' : 'Prepare', isFil ? 'Ihanda ang kathang-isip na kaso, observer sheet at kasalukuyang aprubadong lokal na gabay. Kumpirmahin ang mga contact, iskedyul at saklaw bago ang sesyon.' : 'Prepare fictional cases, observer sheets and the current approved local guide. Confirm contacts, schedules and scope before the session.'),
      heading('run', isFil ? 'Patakbuhin' : 'Run', isFil ? 'Para sa bawat aralin, ibigay muna ang kaso, humingi ng desisyon, ipakita ang halimbawa, saka obserbahan ang pagbabalik-demonstrasyon o paliwanag.' : 'For each lesson, give the case first, ask for a decision, show the example, then observe the return demonstration or explanation.'),
      heading('observe', isFil ? 'Obserbahan' : 'Observe', moduleCards.map(c => `- ${isFil ? c.title_fil : selected.find(l => l.code === c.code).title_en}: ${isFil ? c.indicator_fil : c.indicator_en}`).join('\n')),
      heading('follow-up', isFil ? 'Pagkatapos' : 'Follow-up', isFil ? 'Ibalik ang tiyak na feedback sa bawat kalahok at magtakda ng muling pagsubok sa kailangang ayusin. Huwag gumamit ng tunay na client record sa pagsasanay.' : 'Give each learner specific feedback and arrange a retry for the step needing correction. Do not use real client records in practice.'),
      heading('review', isFil ? 'Kalagayan ng pagsusuri' : 'Review status', isFil ? 'Draft para sa staging at pagsusuri. Kailangang kumpirmahin ang klinikal at lokal na gabay bago mailathala.' : 'Draft for staging and review. Clinical and local guidance must be confirmed before publication.'),
    ].join('\n');
    write(path.join(dir, `facilitator-notes.${lang}.md`), notes);
  }
  write(path.join(dir, 'transfer.json'), { job_aid: 'job-aid.{language}.md', workplace_task: { fil: 'Gamit ang kathang-isip na kaso at kasalukuyang lokal na gabay, ulitin ang gawaing kailangan ng pagsasanay sa harap ng supervisor.', en: 'Using a fictional case and current local guide, repeat the task needing practice with a supervisor.' }, supervision: { fil: 'Markahan ang parehong observer indicator, magbigay ng feedback at magtakda ng susunod na pagsubok.', en: 'Score the same observer indicator, give feedback and schedule a retry.' }, recall_schedule_days: [2, 14, 60], delivery: 'content specification only; no reminders scheduled', recall_items: selected.map(l => ({ lesson_key: l.lesson_key, check: json(path.join(dir, 'lessons', l.lesson_key, 'lesson.json')).sections.find(s => s.id === 'check-transfer').check })) });
  for (const lang of ['fil','en']) write(path.join(dir, `job-aid.${lang}.md`), `# ${lang === 'fil' ? module.title_fil ?? module.title_en : module.title_en}\n\n${moduleCards.map(c => `- ${lang === 'fil' ? c.action_fil : c.action_en}`).join('\n')}\n`);
  write(path.join(dir, 'review.json'), { status: 'draft', publication_allowed: false, lessons: selected.map(l => ({ lesson_key: l.lesson_key, status: 'authored-draft', independent_review: null, learner_pilot: null, publication_allowed: false })), source_training_hours: module.source_allocation_hours, clinical_review: 'pending after system staging' });
}
blueprint.authored_lesson_count = seen.size;
write(blueprintPath, blueprint);
write(path.join(chapterRoot, 'review-queue.json'), blueprint.modules.flatMap(m => m.lessons.map(l => ({
  lesson_code: l.code,
  module_key: m.module_key,
  lesson_key: l.lesson_key,
  reference_pages: l.source_pages.R,
  facilitator_pages: l.source_pages.F,
  review_focus: ['3.3','3.4','3.5','3.6','3.7','3.8','3.9','3.10'].includes(m.code) ? ['current clinical/program guidance','BHW scope','local referral pathway','Filipino/English wording'] : m.code === '3.11' ? ['current local forms','privacy and records','Filipino/English wording'] : ['local workflow','BHW scope','Filipino/English wording'],
  current_authority: null,
  reviewer: null,
  reviewed_on: null,
  disposition: 'pending review after draft staging',
  publication_allowed: false,
}))));
console.log(`Authored ${seen.size} offline lesson drafts`);
