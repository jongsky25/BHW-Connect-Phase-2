import {readFile,writeFile} from 'node:fs/promises';
import {lessons} from './content.mjs';
const moduleRoot=new URL('../../content/training/day1-basic-competencies/modules/',import.meta.url);
const readJSON=async p=>JSON.parse(await readFile(new URL(p,moduleRoot),'utf8'));
const original=await readJSON('01-tungkulin-ng-bhw/coverage.json');
const corrected={
  'm1.competency':'D5; F19–20', 'm1.uhc.shift':'D7; F20; R11', 'm1.uhc.organizing':'D7,13; F20',
  'm1.hepo.umbrella':'D8; R11; conceptual illustration D7/F20', 'm1.hepo.knowledge':'D8; R11',
  'm1.role.educator':'D9; R11–12', 'm1.educator.lifestages':'D9; R11–12', 'm1.educator.allsectors':'D9; R12',
  'm1.role.organizer':'D10; R12', 'm1.organizer.participation':'D10; R12', 'm1.organizer.planningteam':'D10; R12', 'm1.organizer.liph':'R12',
  'm1.role.provider':'D11; R12', 'm1.provider.firstcontact':'D11; R12', 'm1.provider.guide':'D11; R12', 'm1.provider.initialservices':'R12',
  'm1.provider.monitoring':'D12; R12', 'm1.provider.records':'D12; R12', 'm1.provider.documents':'D12; R12; F20', 'm1.skills.crossref':'F20 item 7',
};
const coverage={status:'proposed, awaiting review',legend:'R=Reference Manual; F=Facilitator Guide; D=Day 1 presentation; one-based PDF page numbers',concepts:original.concepts.filter(c=>!c.redundant_with).map(c=>({
  id:c.id,legacyStatement:c.statement_en,correctedSource:corrected[c.id],locations:lessons.flatMap(l=>l.sections.filter(s=>s.concepts.includes(c.id)).map(s=>({lesson:l.number,lessonKey:l.id,read:s.id,slide:s.slide.id,languages:['fil','en']}))),
})),exclusions:[{id:'m1.outline.repeat',source:'D4,14,26,42,47,51,58,68',reason:'Replaced by course navigation'},{id:'m1.filler.heels',source:'D41',reason:'Unrelated interstitial'},{id:'m1.filler.hydration',source:'D67',reason:'Interstitial; does not exclude separately sourced OSH heat/hydration content'}]};
await writeFile(new URL('coverage-map.json',import.meta.url),JSON.stringify(coverage,null,2)+'\n');
const ownership={
  '06-komunikasyon':{'1.6.1':['gather'],'1.6.2':['clarify'],'1.6.3':['empathy','health-promotion'],'1.6.4':['assess','record'],'1.6.5':['profile','family-planning','distress','smoking','barriers']},
  '07-problema':{'1.7.1':['define'],'1.7.2':['whys','diarrhoea-example','determinants'],'1.7.3':['prioritize'],'1.7.4':['solutions','recommend','mobilize']},
  '08-osh':{'1.8.1':['sharps','accidents','stress'],'1.8.2':['exposure','ergonomics','heat','infection','vectors'],'1.8.3':['requirements','prepare'],'1.8.4':['practice']},
  '09-sustainable-practices':{'1.9.1':['competency','resources'],'1.9.2':['safe-savings','plastics','organize'],'1.9.3':['productivity','communicate','review']},
};
const incoming=[];
for(const [folder,groups] of Object.entries(ownership)){
  const baseline=await readJSON(folder+'/coverage.json');const prefix='m'+Number(folder.slice(0,2))+'.';
  const assigned=Object.values(groups).flat().map(id=>prefix+id);
  for(const c of baseline.concepts){if(!c.redundant_with&&!assigned.includes(c.id))throw Error('Unmapped incoming concept '+c.id);}
  for(const [lesson,ids] of Object.entries(groups))for(const id of ids){const concept=baseline.concepts.find(c=>c.id===prefix+id);if(!concept)throw Error('Unknown '+prefix+id);incoming.push({id:concept.id,lesson,legacyModule:folder,statement:concept.statement_en,sourceAsMerged:concept.source});}
}
await writeFile(new URL('incoming-map.json',import.meta.url),JSON.stringify({status:'proposal only; no 06–09 content changed',base:'652b723af6a8e81426f797c1b91d53dba0b7b484',notes:'Owning lessons preserve stable IDs; concepts recur in practice. All five hazard groups must appear together in 1.8.1 and each receive prevention/reporting treatment across 1.8.2–1.8.4. See reconciliation for citation corrections and cross-subchapter boundaries.',concepts:incoming},null,2)+'\n');
const assets=[
 ['A01','Original reusable Marites scene sketches','Pagtuturo, pag-uusap sa komunidad, at paggabay sa residente.','Teaching, community discussion, and guiding a resident.','D7; F20; R11–12'],
 ['A02','Three-role relationship map','Tatlong magkakaugnay na papel sa pagsulong ng kalusugan.','Three connected roles in promoting health.','D7–8; F20'],
 ['A03','Life-stage and audience illustrations','Iba’t ibang kausap at yugto ng buhay.','Different audiences and life stages.','D9; R11–12'],
 ['A04','Organizing and planning sequence','Obserbasyon, pakikilahok, at ambag sa pagpaplano.','Observation, participation, and planning contributions.','D10; R12'],
 ['A05','Service coordination and scope pathway','Pangangailangan, angkop na tulong, at follow-up.','A need, appropriate assistance, and follow-up.','D11–12; R12'],
 ['A06','Fictional record thumbnails','Mga halimbawang household profile, master list, registry, at form.','Example household profile, master list, registry, and assigned form.','D12; R12'],
 ['A07','Applied scene and handover sequence','Nakita, ginawa, at kailangan pang aksyon sa kathang-isip na sitwasyon.','Observation, action taken, and remaining needs in a fictional situation.','D6,13; F20; instructional adaptation'],
].map(([id,purpose,fil,en,sources])=>({id,purpose,alt:{fil,en},sources,provenance:'Original code-authored SVG/HTML by Codex for this prototype, 2026-09-24; no third-party imagery, logos, or real records. Repository licensing applies; no external reuse rights asserted.',reviewStatus:'draft schematic; awaiting user review',captions:'Bilingual live captions are authored per slide in content.mjs; they and live labels carry the essential meaning.',file:'app.mjs visual()/scene() plus content.mjs'}));
await writeFile(new URL('assets.json',import.meta.url),JSON.stringify({assets},null,2)+'\n');
console.log(`Mapped ${coverage.concepts.length} required sample concepts and ${incoming.length} incoming concepts; ${assets.length} asset briefs.`);
