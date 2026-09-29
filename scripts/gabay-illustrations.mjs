// Original, text-free SVG scenes for the Gabay flipchart cards.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'public/gabay-flipcharts');
mkdirSync(directory, { recursive: true });
const person = (x, y, color = '#176b68') => `<g transform="translate(${x} ${y})"><circle cx="0" cy="-42" r="24" fill="#f4b992"/><path d="M-34 45v-32q0-31 34-31t34 31v32" fill="${color}"/><path d="M-13-45q13-18 29-8" fill="none" stroke="#29354a" stroke-width="8" stroke-linecap="round"/></g>`;
const clinic = (x, y, color = '#d9efea') => `<g transform="translate(${x} ${y})"><rect x="-78" y="-71" width="156" height="137" rx="10" fill="${color}" stroke="#176b68" stroke-width="6"/><path d="M-90-72L0-119 90-72" fill="none" stroke="#176b68" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M-17-57v45m-23-23h46" stroke="#176b68" stroke-width="8" stroke-linecap="round"/><rect x="-23" y="16" width="46" height="50" rx="4" fill="#fff"/></g>`;
const desk = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-91" y="-35" width="182" height="97" rx="9" fill="#e1a876"/><rect x="-104" y="-48" width="208" height="20" rx="9" fill="#a75e48"/><path d="M-38 4h76" stroke="#fff" stroke-width="8" stroke-linecap="round"/></g>`;
const calendar = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-70" y="-69" width="140" height="139" rx="12" fill="#fff" stroke="#176b68" stroke-width="6"/><path d="M-70-30h140M-38-86v27M38-86v27" stroke="#176b68" stroke-width="8" stroke-linecap="round"/><path d="M-23 16l18 17 33-39" fill="none" stroke="#e08152" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></g>`;
const paper = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-70" y="-91" width="140" height="180" rx="8" fill="#fff" stroke="#176b68" stroke-width="6"/><path d="M-39-50h80M-39-21h80M-39 8h55M-39 48h65" stroke="#a8cfc9" stroke-width="7" stroke-linecap="round"/><path d="M25 32l11 10 20-24" fill="none" stroke="#e08152" stroke-width="8" stroke-linecap="round"/></g>`;
const bubble = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-70-36q0-28 30-28h84q28 0 28 27v49q0 27-28 27h-34l-23 22v-22h-29q-28 0-28-27z" fill="#fff" stroke="#176b68" stroke-width="6"/><circle cx="-30" cy="-12" r="6" fill="#e08152"/><circle cy="-12" r="6" fill="#e08152"/><circle cx="30" cy="-12" r="6" fill="#e08152"/></g>`;
const arrow = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}m-16-14l16 14-16 14" fill="none" stroke="#e08152" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
const scenes = {
  'yakap-clinic': clinic(262, 245) + clinic(526, 245, '#e9edec') + person(110, 330) + arrow(150, 285, 177, 285) + `<circle cx="262" cy="385" r="22" fill="#176b68"/><path d="M251 385l8 8 16-19" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`,
  'yakap-consult': person(270, 235) + person(485, 235, '#e08152') + bubble(374, 150) + desk(375, 346),
  'yakap-followup': clinic(199, 251) + arrow(300, 255, 360, 255) + calendar(510, 265) + `<path d="M475 378Q310 438 190 372" fill="none" stroke="#a8cfc9" stroke-width="8" stroke-dasharray="15 15"/>`,
  'gamot-consult': person(270, 230) + person(490, 230, '#e08152') + bubble(385, 147) + desk(382, 344),
  'gamot-prescription': person(198, 250, '#e08152') + paper(391, 255) + person(592, 250) + arrow(251, 248, 303, 248) + arrow(475, 248, 516, 248),
  'gamot-facility': person(206, 248) + desk(508, 298) + person(518, 188, '#e08152') + bubble(348, 177) + arrow(269, 276, 341, 276),
  'rehistro-clarify': person(388, 190) + bubble(388, 325) + `<path d="M315 366q-55 30-132 20m280-20q55 30 132 20" fill="none" stroke="#e08152" stroke-width="8"/>` + paper(138, 378) + clinic(642, 383),
  'rehistro-pin': person(230, 239) + desk(535, 305) + person(535, 195, '#e08152') + bubble(376, 174) + arrow(296, 295, 378, 295),
  'rehistro-selection': paper(152, 247) + arrow(245, 255, 300, 255) + clinic(423, 250) + arrow(510, 255, 560, 255) + person(647, 250),
};
for (const [name, drawing] of Object.entries(scenes)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 780 520" role="img"><rect width="780" height="520" rx="28" fill="#f5faf8"/><circle cx="666" cy="87" r="55" fill="#d9efea"/><circle cx="100" cy="428" r="78" fill="#fcebdc"/><path d="M65 432h650" stroke="#a8cfc9" stroke-width="5" stroke-linecap="round"/>${drawing}</svg>`;
  writeFileSync(path.join(directory, `${name}.svg`), svg);
}
console.log(`Wrote ${Object.keys(scenes).length} original Gabay illustrations.`);
