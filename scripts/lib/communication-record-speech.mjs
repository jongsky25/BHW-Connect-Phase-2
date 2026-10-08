// Lesson 1.6.4 only; display names and all sibling style inputs stay intact.
export const communicationRecordStyle = language =>
  `Speak ${language === 'fil' ? 'natural Filipino (Tagalog)' : 'natural Philippine English'} as one continuous adult Filipina trainer, Kore, in a warm settled feminine mid-register. Every separately supplied heading, sentence, quotation and ending continues this identical woman narrator. Use gentle pauses and instructional emphasis without acting out speakers or switching voice. Speech spellings Lisa and Gibz represent displayed Liza (LEE-sa) and Gibs (gibz). Preserve every word, source attribution, uncertainty, correction and negation; finish each phrase completely. Do not translate, paraphrase or add words. Recording lesson delivery revision 1.`;
export const communicationRecordSpokenText = (text, language) =>
  text.replace(/\bLiza\b/g,'Lisa').replace(/\bGibs\b/g,'Gibz');
