// Retain the approved opening portrait and keep the check illustration answer-neutral.
// Also applied after importing generated asset metadata; no narration text changes.
import fs from 'node:fs';
const leaf='content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-explain/';
const lesson=JSON.parse(fs.readFileSync(leaf+'lesson.json')),slides=JSON.parse(fs.readFileSync(leaf+'slides.json'));
lesson.sections[0].asset_ids=['gibs-portrait','explain-teach-back'];slides[0].asset_ids=lesson.sections[0].asset_ids;
const a=lesson.assets.find(a=>a.id==='explain-check');
a.caption_fil='Hindi pa kumpirmado ang appointment. Ano ang susunod na sasabihin ni Gibs?';
a.caption_en='The appointment is unconfirmed. What should Gibs say next?';
fs.writeFileSync(leaf+'lesson.json',JSON.stringify(lesson,null,2)+'\n');fs.writeFileSync(leaf+'slides.json',JSON.stringify(slides,null,2)+'\n');
