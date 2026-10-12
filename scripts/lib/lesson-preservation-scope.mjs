// Lesson preservation tests pin only what a lesson release owns or could
// damage: training content and media, story compositions and lesson
// receipts. Whole-repo pins made unrelated app changes (an i18n string, an
// assessor test) fail every earlier lesson's test.
const LESSON_OWNED_PREFIXES=['content/training/','public/training/','remotion/','docs/lesson-'];
export const lessonOwned=p=>LESSON_OWNED_PREFIXES.some(prefix=>p.startsWith(prefix));
