// The approved P1 review packet is the versioned source for the P2 course.
// Fail closed if its structure changes, so a reviewer can update wording in
// one place and see whether the import contract needs revising.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lessons = readFileSync(path.join(root, 'docs/gabay-sa-philhealth/p1-lessons-and-claims.md'), 'utf8');
const assessment = readFileSync(path.join(root, 'docs/gabay-sa-philhealth/p1-assessment.md'), 'utf8');

function field(block, name) {
  const match = block.match(new RegExp(`\\*\\*${name}:\\*\\* ([^\\n]+)`));
  if (!match) throw new Error(`Gabay source missing ${name}`);
  return match[1].trim();
}

export function loadGabayContent() {
  const sources = Object.fromEntries([...lessons.matchAll(/^\| \*\*((?:PH|BHW)-\d+)\*\* \|[^\n]+/gm)].map(([row, id]) => [id,
    [...row.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((match) => match[1])]));
  if (Object.keys(sources).length !== 11) throw new Error('Gabay source register changed');

  const moduleBlocks = [...lessons.matchAll(/^## Module (\d+) — ([^\n]+)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)];
  if (moduleBlocks.length !== 5) throw new Error('Gabay needs five lesson modules');
  const practiceFil = [
    'Iuri ang tatlong tanong: walang PIN; aling gamot ang iinumin; at saan ang accredited clinic.',
    'Iayos ang apat na hakbang: PIN/rekord, pagpili ng clinic, unang konsultasyon, at follow-up ayon sa clinician.',
    'Sagutin sa dalawang pangungusap ang tanong na “Libre ba ang gamot na ito ngayon?” Ibigay ang daloy at susunod na hakbang.',
    'Iuri ang mga kaso bilang PIN/rekord, pagpili ng clinic, dependent/paglipat, o kailangan pang linawin.',
    'Magsanay ng maikling usapan sa kapareha o sariling recording; gumamit ng teach-back.',
  ];
  const modules = moduleBlocks.map(([, number, titles, body]) => {
    const [title_fil, title_en] = titles.split(' / ').map((s) => s.trim());
    const claimIds = field(body, 'Observable objectives').match(/(?:PH|BHW)-\d+/g) ?? [];
    if (!title_fil || !title_en || claimIds.some((id) => !sources[id])) throw new Error(`Invalid Gabay module ${number}`);
    const practiceEn = field(body, 'Practice');
    return {
      id: `gabay-${number.padStart(2, '0')}`, position: Number(number), type: 'text',
      title_fil, title_en,
      body_fil: `${field(body, 'Filipino draft')}\n\nPagsasanay: ${practiceFil[Number(number) - 1]}`,
      body_en: `${field(body, 'English draft')}\n\nPractice: ${practiceEn}`,
      claim_ids: claimIds,
    };
  });

  const questionBlocks = [...assessment.matchAll(/^### Q(\d+) — ([^\n]+)\n([\s\S]*?)(?=^### Q|^## Observed role-play|$(?![\s\S]))/gm)];
  if (questionBlocks.length !== 10) throw new Error('Gabay needs ten quiz questions');
  const rationaleFil = [
    'Gumagabay ang BHW; PhilHealth ang tumitingin sa rekord ng miyembro.',
    'Ang residente mismo ang gagamit ng sariling credentials sa opisyal na channel.',
    'Magkaiba ang PIN at pagpili ng YAKAP clinic.',
    'Ang clinician ang magpapasya sa angkop na test o referral pagkatapos ng assessment.',
    'Magsisimula sa konsultasyon at angkop na reseta bago ang accredited dispensing.',
    'Hindi patunay ng sakop o kasalukuyang stock ang listahan ng accredited na pasilidad.',
    'Sa opisyal na PhilHealth channel lilinawin ang PIN o rekord.',
    'Linawin muna kung PIN/rekord o pagpili ng YAKAP clinic ang kailangan.',
    'Suriin ang kasalukuyang proseso at rekord ng dependent sa PhilHealth.',
    'Magbigay ng opisyal na hakbang na magagawa nang walang internet at gumamit ng teach-back.',
  ];
  const questions = questionBlocks.map(([, number, , body]) => {
    const optionRows = [...body.matchAll(/^([A-C])\. (.+) \/ (.+)$/gm)];
    if (optionRows.length !== 3) throw new Error(`Q${number} needs three bilingual options`);
    const correct = optionRows.findIndex(([, , fil, en]) => fil.includes('**(Correct)**') || en.includes('**(Correct)**'));
    if (correct < 0 || optionRows.filter(([, , fil, en]) => fil.includes('**(Correct)**') || en.includes('**(Correct)**')).length !== 1)
      throw new Error(`Q${number} needs exactly one key`);
    return {
      id: `Q${number}`, position: Number(number), prompt_fil: field(body, 'Filipino'), prompt_en: field(body, 'English'),
      options: optionRows.map(([, , fil, en]) => ({ fil: fil.replace(' **(Correct)**', ''), en: en.replace(' **(Correct)**', '') })),
      correct_option_index: correct, rationale_fil: rationaleFil[Number(number) - 1], rationale_en: field(body, 'Rationale'),
    };
  });

  return {
    id: 'philhealth-gabay',
    title_fil: 'BHW Connect: Gabay sa PhilHealth — YAKAP, GAMOT, at Tamang Pagpaparehistro',
    title_en: 'BHW Connect: Guide to PhilHealth — YAKAP, GAMOT, and the Right Registration Path',
    description_fil: 'Limang aralin, pagsusulit, at naobserbahang role-play para sa tamang paggabay sa residente.',
    description_en: 'Five lessons, a knowledge quiz, and an observed role-play for guiding residents accurately.',
    assessment_kind: 'gabay_roleplay', quiz_passing_percent: 80, quiz_max_attempts: 3,
    opening_diagnostic: [
      { id: 'D1', prompt_fil: 'Ang pagkakaroon ba ng PIN ay nangangahulugang may napili nang YAKAP clinic?', prompt_en: 'Does having a PIN mean a YAKAP clinic has already been selected?', answer_fil: 'Hindi. Magkaibang hakbang ang PIN/rekord at pagpili ng clinic.', answer_en: 'No. A PIN or member record and clinic selection are separate steps.' },
      { id: 'D2', prompt_fil: 'Maaari bang ipangako ng BHW na may stock ngayon ang isang gamot?', prompt_en: 'Can a BHW promise that a named medicine is available today?', answer_fil: 'Hindi. Kumpirmahin ang reseta, sakop, at availability sa angkop na opisyal na channel.', answer_en: 'No. Verify prescription, coverage, and availability through the appropriate official channel.' },
      { id: 'D3', prompt_fil: 'Kapag sinabi ng residente na “magparehistro,” ano ang unang itatanong?', prompt_en: 'When a resident says “register,” what should the BHW ask first?', answer_fil: 'Kung PIN o PhilHealth record ang kailangan, o pagpili ng YAKAP clinic.', answer_en: 'Whether they mean a PIN or PhilHealth record, or selecting a YAKAP clinic.' },
    ], modules, questions, sources,
  };
}
