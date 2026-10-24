import type {PublishedLesson} from './reference-navigation';

export const HEPO_PRESENTATION_HASH = '88cf770c7b81b869cc73e684e2ee6eb2bdc105d189f76c2d7e4c406f61c69990';
export function isHepoPresentation(lesson?: PublishedLesson) {
  return lesson?.lesson_key === 'bhw-roles-hepo' && lesson.revision.content_hash === HEPO_PRESENTATION_HASH;
}
const goals = {
  morning: ['Explain how one BHW can teach, organize and help people reach services.', 'Ipaliwanag kung paano nagtuturo, nag-oorganisa at gumagabay sa serbisyo ang iisang BHW.'],
  prevention: ['Explain how sharing knowledge and inviting participation support health promotion.', 'Ipaliwanag kung paano nakatutulong sa health promotion ang pagbabahagi ng kaalaman at pag-anyaya ng pakikilahok.'],
  hepo: ['Connect the three roles. The visual is not an official organizational chart or proof of an appointment.', 'Iugnay ang tatlong tungkulin. Hindi opisyal na organizational chart o patunay ng appointment ang larawan.'],
  knowledge: ['Explain why uncertain information must be confirmed before sharing.', 'Ipaliwanag kung bakit kailangang kumpirmahin ang hindi tiyak na impormasyon bago ito ibahagi.'],
  check: ['Apply the lesson: choose a response, then read the feedback.', 'Gamitin ang natutuhan: pumili ng sagot, saka basahin ang feedback.'],
};
export function hepoSectionGoal(position: string, en: boolean) {
  const id = position.endsWith('-slide') ? position.slice(0, -6) : position;
  return Object.hasOwn(goals, id) ? goals[id as keyof typeof goals][en ? 0 : 1] : null;
}
export function hepoSlideDisplay(position: string, display: string, en: boolean) {
  if (position !== 'morning-slide') return display;
  return display.replace('08:00 ·', en ? '8:00 a.m. ·' : '8:00 ng umaga ·')
    .replace('10:00 ·', en ? '10:00 a.m. ·' : '10:00 ng umaga ·')
    .replace('11:00 ·', en ? '11:00 a.m. ·' : '11:00 ng umaga ·');
}
